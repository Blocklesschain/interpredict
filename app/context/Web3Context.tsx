'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ethers } from 'ethers'
import { clearAuthState } from '@/lib/interlinkAuth'
import { INTERPREDICT_ABI } from '@/lib/interpredictProtocol'
import {
  translations,
  type LocaleType,
  type TranslationKey,
} from './translations'

const INTERLINK_CHAIN_ID = 19_042_026n
const INTERLINK_CHAIN_HEX = `0x${INTERLINK_CHAIN_ID.toString(16)}`
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ''
const CONNECTED_KEY = 'interpredict_connected'
const LOCALE_KEY = 'interpredict-locale'
const LEGACY_LOCALE_KEY = 'interpredict_lang'
const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

type InjectedProvider = ethers.Eip1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: InjectedProvider
  }
}

export type ActivityStatus = 'Pending' | 'Success' | 'Failed'

export type ActivityRecord = {
  id: string
  label: string
  detail: string
  status: ActivityStatus
  timestamp: string
  txHash?: string
}

export type ProtocolRoles = {
  isAdmin: boolean
  isTeam: boolean
  isDECManager: boolean
  isActiveDEC: boolean
  canPause: boolean
}

export type TokenMetadata = {
  address: string
  symbol: string
  decimals: number
  proposalFee: bigint
  proposalSeed: bigint
  minimumTrade: bigint
}

type Web3ContextType = {
  locale: LocaleType
  setLocale: (locale: LocaleType) => void
  t: (key: TranslationKey) => string
  account: string
  chainId: bigint | null
  isCorrectNetwork: boolean
  isConnecting: boolean
  provider: ethers.BrowserProvider | null
  roles: ProtocolRoles
  token: TokenMetadata
  protocolPaused: boolean
  txStatus: string
  txError: string
  activities: ActivityRecord[]
  contractAddress: string
  isConfigured: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchNetwork: () => Promise<void>
  refreshWalletState: () => Promise<void>
  clearTransactionStatus: () => void
  hasProtocolFunction: (name: string) => boolean
  readContract: <T = unknown>(method: string, args?: unknown[]) => Promise<T>
  runTransaction: (
    method: string,
    args: unknown[],
    label: string,
  ) => Promise<ethers.ContractTransactionReceipt | null>
  approveSettlement: (amount: bigint) => Promise<void>
}

const emptyRoles: ProtocolRoles = {
  isAdmin: false,
  isTeam: false,
  isDECManager: false,
  isActiveDEC: false,
  canPause: false,
}

const emptyToken: TokenMetadata = {
  address: '',
  symbol: 'tITL',
  decimals: 18,
  proposalFee: 0n,
  proposalSeed: 0n,
  minimumTrade: 0n,
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)
const protocolInterface = new ethers.Interface(INTERPREDICT_ABI)

function activityKey(address: string) {
  return `interpredict_activity_${address.toLowerCase()}`
}

function isLocale(value: string | null): value is LocaleType {
  return value === 'en' || value === 'zh' || value === 'es' || value === 'fr'
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const candidate = error as {
      shortMessage?: string
      reason?: string
      info?: { error?: { message?: string } }
      message?: string
    }
    return (
      candidate.shortMessage ||
      candidate.reason ||
      candidate.info?.error?.message ||
      candidate.message ||
      'Transaction failed'
    )
  }
  return typeof error === 'string' ? error : 'Transaction failed'
}

function loadActivities(address: string) {
  if (!address) return []
  try {
    const value = window.localStorage.getItem(activityKey(address))
    return value ? (JSON.parse(value) as ActivityRecord[]) : []
  } catch {
    return []
  }
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en')
  const [account, setAccount] = useState('')
  const accountRef = useRef('')
  const [chainId, setChainId] = useState<bigint | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [roles, setRoles] = useState<ProtocolRoles>(emptyRoles)
  const [token, setToken] = useState<TokenMetadata>(emptyToken)
  const [protocolPaused, setProtocolPaused] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [txStatus, setTxStatus] = useState('')
  const [txError, setTxError] = useState('')
  const [activities, setActivities] = useState<ActivityRecord[]>([])

  const isConfigured = ethers.isAddress(CONTRACT_ADDRESS)
  const isCorrectNetwork = chainId === INTERLINK_CHAIN_ID

  const hasProtocolFunction = useCallback((name: string) => {
    try {
      return Boolean(protocolInterface.getFunction(name))
    } catch {
      return false
    }
  }, [])

  const setLocale = useCallback((next: LocaleType) => {
    setLocaleState(next)
    window.localStorage.setItem(LOCALE_KEY, next)
    window.localStorage.removeItem(LEGACY_LOCALE_KEY)
    document.documentElement.lang = next
  }, [])

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key] ?? translations.en[key],
    [locale],
  )

  const persistActivity = useCallback((address: string, record: ActivityRecord) => {
    if (!address) return
    setActivities(previous => {
      const next = [record, ...previous].slice(0, 100)
      window.localStorage.setItem(activityKey(address), JSON.stringify(next))
      return next
    })
  }, [])

  const readAccountMetadata = useCallback(
    async (nextProvider: ethers.BrowserProvider, address: string) => {
      if (!isConfigured || !address) {
        setRoles(emptyRoles)
        setToken(emptyToken)
        setProtocolPaused(false)
        return
      }

      const network = await nextProvider.getNetwork()
      setChainId(network.chainId)
      if (network.chainId !== INTERLINK_CHAIN_ID) {
        setRoles(emptyRoles)
        setToken(emptyToken)
        setProtocolPaused(false)
        return
      }

      const protocol = new ethers.Contract(
        CONTRACT_ADDRESS,
        INTERPREDICT_ABI,
        nextProvider,
      )
      const safeBoolean = async (call: () => Promise<unknown>) => {
        try {
          return Boolean(await call())
        } catch {
          return false
        }
      }
      const safeBigInt = async (call: () => Promise<unknown>) => {
        try {
          return BigInt(String(await call()))
        } catch {
          return 0n
        }
      }

      const adminRole = ethers.ZeroHash
      const teamRole = ethers.id('TEAM_MARKET_ROLE')
      const decManagerRole = ethers.id('DEC_MANAGER_ROLE')
      const pauserRole = ethers.id('PAUSER_ROLE')
      const [isAdmin, isTeam, isDECManager, isActiveDEC, pauser, paused] =
        await Promise.all([
          safeBoolean(() => protocol.hasRole(adminRole, address)),
          safeBoolean(() => protocol.hasRole(teamRole, address)),
          safeBoolean(() => protocol.hasRole(decManagerRole, address)),
          safeBoolean(() => protocol.isActiveDECMember(address)),
          hasProtocolFunction('PAUSER_ROLE')
            ? safeBoolean(() => protocol.hasRole(pauserRole, address))
            : Promise.resolve(false),
          hasProtocolFunction('paused')
            ? safeBoolean(() => protocol.paused())
            : Promise.resolve(false),
        ])
      setRoles({
        isAdmin,
        isTeam,
        isDECManager,
        isActiveDEC,
        canPause: isAdmin || pauser,
      })
      setProtocolPaused(paused)

      try {
        const settlementAddress = String(await protocol.settlementToken())
        const settlement = new ethers.Contract(
          settlementAddress,
          ERC20_ABI,
          nextProvider,
        )
        const [symbol, decimals, proposalFee, proposalSeed, minimumTrade] =
          await Promise.all([
            settlement.symbol().catch(() => 'tITL'),
            settlement.decimals().catch(() => 18),
            safeBigInt(() => protocol.proposalFee()),
            safeBigInt(() => protocol.proposalSeed()),
            safeBigInt(() => protocol.minimumTrade()),
          ])
        setToken({
          address: settlementAddress,
          symbol: String(symbol),
          decimals: Number(decimals),
          proposalFee,
          proposalSeed,
          minimumTrade,
        })
      } catch {
        setToken(emptyToken)
      }
    },
    [hasProtocolFunction, isConfigured],
  )

  const applyAccount = useCallback(
    async (address: string, nextProvider: ethers.BrowserProvider) => {
      const normalized = address ? ethers.getAddress(address) : ''
      const previous = accountRef.current
      if (previous && previous.toLowerCase() !== normalized.toLowerCase()) {
        clearAuthState(previous)
      }
      accountRef.current = normalized
      setAccount(normalized)
      setActivities(normalized ? loadActivities(normalized) : [])
      if (!normalized) {
        window.localStorage.removeItem(CONNECTED_KEY)
        setRoles(emptyRoles)
        setToken(emptyToken)
        setProtocolPaused(false)
        return
      }
      window.localStorage.setItem(CONNECTED_KEY, 'true')
      await readAccountMetadata(nextProvider, normalized)
    },
    [readAccountMetadata],
  )

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) throw new Error('No EVM wallet was detected')
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: INTERLINK_CHAIN_HEX }],
      })
    } catch (error) {
      const code = (error as { code?: number }).code
      if (code !== 4902) throw error
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: INTERLINK_CHAIN_HEX,
            chainName: 'Interlink Testnet',
            nativeCurrency: {
              name: 'Interlink Token',
              symbol: 'tITL',
              decimals: 18,
            },
            rpcUrls: ['https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'],
            blockExplorerUrls: ['https://testnet-explorer.interlinklabs.ai'],
          },
        ],
      })
    }
    const nextProvider = new ethers.BrowserProvider(window.ethereum)
    setProvider(nextProvider)
    const network = await nextProvider.getNetwork()
    setChainId(network.chainId)
    if (accountRef.current) {
      await readAccountMetadata(nextProvider, accountRef.current)
    }
  }, [readAccountMetadata])

  const connectWallet = useCallback(async () => {
    setTxError('')
    if (!window.ethereum) {
      setTxError('Install an EVM wallet to continue.')
      return
    }
    if (!isConfigured) {
      setTxError(translations[locale].configureContract)
      return
    }
    setIsConnecting(true)
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      await switchNetwork()
      const nextProvider = new ethers.BrowserProvider(window.ethereum)
      setProvider(nextProvider)
      const signer = await nextProvider.getSigner()
      await applyAccount(await signer.getAddress(), nextProvider)
      setTxStatus('Wallet connected.')
    } catch (error) {
      setTxError(errorMessage(error))
    } finally {
      setIsConnecting(false)
    }
  }, [applyAccount, isConfigured, locale, switchNetwork])

  const disconnectWallet = useCallback(() => {
    if (accountRef.current) clearAuthState(accountRef.current)
    accountRef.current = ''
    setAccount('')
    setProvider(null)
    setChainId(null)
    setRoles(emptyRoles)
    setToken(emptyToken)
    setProtocolPaused(false)
    setActivities([])
    setTxStatus('Wallet session cleared.')
    setTxError('')
    window.localStorage.removeItem(CONNECTED_KEY)
  }, [])

  const refreshWalletState = useCallback(async () => {
    if (!window.ethereum) return
    const nextProvider = new ethers.BrowserProvider(window.ethereum)
    setProvider(nextProvider)
    const network = await nextProvider.getNetwork()
    setChainId(network.chainId)
    const accounts = (await window.ethereum.request({
      method: 'eth_accounts',
    })) as string[]
    if (accounts.length && window.localStorage.getItem(CONNECTED_KEY) === 'true') {
      await applyAccount(accounts[0], nextProvider)
    } else if (!accounts.length) {
      await applyAccount('', nextProvider)
    }
  }, [applyAccount])

  const readContract = useCallback(
    async <T,>(method: string, args: unknown[] = []) => {
      if (!isConfigured) throw new Error('V2 contract address is not configured')
      if (!provider) throw new Error('Connect a wallet provider to read account data')
      if (chainId !== INTERLINK_CHAIN_ID) throw new Error('Wrong network')
      if (!hasProtocolFunction(method)) {
        throw new Error(`${method} is not available in the configured contract ABI`)
      }
      const contract = new ethers.Contract(CONTRACT_ADDRESS, INTERPREDICT_ABI, provider)
      return (await contract[method](...args)) as T
    },
    [chainId, hasProtocolFunction, isConfigured, provider],
  )

  const runTransaction = useCallback(
    async (method: string, args: unknown[], label: string) => {
      setTxError('')
      if (!window.ethereum || !accountRef.current) {
        const message = translations[locale].connectRequired
        setTxError(message)
        throw new Error(message)
      }
      if (!isConfigured) {
        const message = translations[locale].configureContract
        setTxError(message)
        throw new Error(message)
      }
      if (chainId !== INTERLINK_CHAIN_ID) {
        const message = translations[locale].wrongNetwork
        setTxError(message)
        throw new Error(message)
      }
      if (!hasProtocolFunction(method)) {
        const message = `${method} is not available in the configured contract ABI`
        setTxError(message)
        throw new Error(message)
      }

      setTxStatus(`${label}: ${translations[locale].transactionPending}`)
      let transactionHash: string | undefined
      try {
        const nextProvider = new ethers.BrowserProvider(window.ethereum)
        const signer = await nextProvider.getSigner()
        const protocol = new ethers.Contract(
          CONTRACT_ADDRESS,
          INTERPREDICT_ABI,
          signer,
        )
        const transaction = await protocol[method](...args)
        transactionHash = transaction.hash
        setTxStatus(`${label}: ${transaction.hash.slice(0, 12)}...`)
        const receipt = await transaction.wait()
        if (!receipt || receipt.status !== 1) throw new Error('Transaction reverted')
        const record: ActivityRecord = {
          id: `${Date.now()}-${transaction.hash}`,
          label,
          detail: 'Confirmed on-chain',
          status: 'Success',
          timestamp: new Date().toISOString(),
          txHash: transaction.hash,
        }
        persistActivity(accountRef.current, record)
        setTxStatus(`${label}: confirmed`)
        await readAccountMetadata(nextProvider, accountRef.current)
        return receipt
      } catch (error) {
        const message = errorMessage(error)
        setTxStatus('')
        setTxError(message)
        persistActivity(accountRef.current, {
          id: `${Date.now()}-failed`,
          label,
          detail: message,
          status: 'Failed',
          timestamp: new Date().toISOString(),
          txHash: transactionHash,
        })
        throw error
      }
    },
    [
      chainId,
      hasProtocolFunction,
      isConfigured,
      locale,
      persistActivity,
      readAccountMetadata,
    ],
  )

  const approveSettlement = useCallback(
    async (amount: bigint) => {
      setTxError('')
      if (!window.ethereum || !accountRef.current) {
        throw new Error(translations[locale].connectRequired)
      }
      if (!token.address || !isConfigured) {
        throw new Error('Settlement token metadata is unavailable')
      }
      if (chainId !== INTERLINK_CHAIN_ID) {
        throw new Error(translations[locale].wrongNetwork)
      }
      const nextProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await nextProvider.getSigner()
      const settlement = new ethers.Contract(token.address, ERC20_ABI, signer)
      const allowance = BigInt(
        String(await settlement.allowance(accountRef.current, CONTRACT_ADDRESS)),
      )
      if (allowance >= amount) return

      setTxStatus(`Settlement approval: ${translations[locale].transactionPending}`)
      try {
        const transaction = await settlement.approve(CONTRACT_ADDRESS, amount)
        setTxStatus(`Settlement approval: ${transaction.hash.slice(0, 12)}...`)
        const receipt = await transaction.wait()
        if (!receipt || receipt.status !== 1) throw new Error('Token approval reverted')
        setTxStatus('Settlement approval: confirmed')
        persistActivity(accountRef.current, {
          id: `${Date.now()}-${transaction.hash}`,
          label: 'Settlement token approval',
          detail: 'Allowance confirmed on-chain',
          status: 'Success',
          timestamp: new Date().toISOString(),
          txHash: transaction.hash,
        })
      } catch (error) {
        const message = errorMessage(error)
        setTxStatus('')
        setTxError(message)
        throw error
      }
    },
    [chainId, isConfigured, locale, persistActivity, token.address],
  )

  const clearTransactionStatus = useCallback(() => {
    setTxStatus('')
    setTxError('')
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved =
        window.localStorage.getItem(LOCALE_KEY) ||
        window.localStorage.getItem(LEGACY_LOCALE_KEY)
      if (isLocale(saved)) {
        setLocaleState(saved)
        window.localStorage.setItem(LOCALE_KEY, saved)
        window.localStorage.removeItem(LEGACY_LOCALE_KEY)
        document.documentElement.lang = saved
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!window.ethereum) return
    const refreshTimer = window.setTimeout(
      () => void refreshWalletState(),
      0,
    )

    const handleAccountsChanged = (...values: unknown[]) => {
      const accounts = (values[0] as string[]) ?? []
      const nextProvider = new ethers.BrowserProvider(window.ethereum!)
      setProvider(nextProvider)
      if (!accounts.length) {
        void applyAccount('', nextProvider)
      } else if (
        accountRef.current ||
        window.localStorage.getItem(CONNECTED_KEY) === 'true'
      ) {
        void applyAccount(accounts[0], nextProvider)
      }
    }
    const handleChainChanged = (...values: unknown[]) => {
      const nextChain = values[0]
      try {
        setChainId(BigInt(String(nextChain)))
      } catch {
        setChainId(null)
      }
      const nextProvider = new ethers.BrowserProvider(window.ethereum!)
      setProvider(nextProvider)
      if (accountRef.current) {
        void readAccountMetadata(nextProvider, accountRef.current)
      }
    }

    window.ethereum.on?.('accountsChanged', handleAccountsChanged)
    window.ethereum.on?.('chainChanged', handleChainChanged)
    return () => {
      window.clearTimeout(refreshTimer)
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [applyAccount, readAccountMetadata, refreshWalletState])

  const value = useMemo<Web3ContextType>(
    () => ({
      locale,
      setLocale,
      t,
      account,
      chainId,
      isCorrectNetwork,
      isConnecting,
      provider,
      roles,
      token,
      protocolPaused,
      txStatus,
      txError,
      activities,
      contractAddress: CONTRACT_ADDRESS,
      isConfigured,
      connectWallet,
      disconnectWallet,
      switchNetwork,
      refreshWalletState,
      clearTransactionStatus,
      hasProtocolFunction,
      readContract,
      runTransaction,
      approveSettlement,
    }),
    [
      account,
      activities,
      approveSettlement,
      chainId,
      clearTransactionStatus,
      connectWallet,
      disconnectWallet,
      hasProtocolFunction,
      isConfigured,
      isConnecting,
      isCorrectNetwork,
      locale,
      protocolPaused,
      provider,
      readContract,
      refreshWalletState,
      roles,
      runTransaction,
      setLocale,
      switchNetwork,
      t,
      token,
      txError,
      txStatus,
    ],
  )

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (!context) throw new Error('useWeb3 must be used within Web3Provider')
  return context
}
