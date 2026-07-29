'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { translations, LocaleType } from './translations'
import { getValidToken } from '@/lib/interlinkAuth'
import contractABI from '@/lib/interpredictAbi.json'

export interface HistoryRecord {
  id: string
  type: 'Market Proposal' | 'Team Deployment' | 'Market Trade' | 'Committee Bond' | 'Governance Vote' | 'DEC Rewards' | 'Creator Fee' | 'Payout'
  description: string
  detail: string
  status: 'Pending' | 'Success' | 'Failed'
  timestamp: string
}

interface Web3ContextType {
  walletAddress: string | null
  txStatus: string | null
  setTxStatus: (status: string | null) => void
  historyLogs: HistoryRecord[]
  decMembers: string[]
  locale: 'en' | 'zh' | 'es' | 'fr'
  setLocale: (lang: 'en' | 'zh' | 'es' | 'fr') => void
  t: (key: keyof typeof translations['en']) => string
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  getWalletBalance: (address: string) => Promise<string>
  createMarketOnChain: (description: string, marketEndTime: number, outcomes: string[], category: number, thumbnailUri: string, resolutionCriteria: string) => Promise<boolean>
  joinDecOnChain: () => Promise<boolean>
  approveDecRequestOnChain: (address: string) => Promise<boolean>
  castVoteOnChain: (marketId: number, support: boolean) => Promise<void>
  placeBetOnChain: (marketId: number, outcomeIndex: number, amount: string) => Promise<boolean>
  initializeMarketOnChain: (marketId: number) => Promise<boolean>
  claimPayoutOnChain: (marketId: number) => Promise<boolean>
  requestResolutionOnChain: (marketId: number) => Promise<boolean>
  resolveMarketOnChain: (marketId: number, winningOutcome: number) => Promise<boolean>
  claimDecRewardsOnChain: () => Promise<boolean>
  claimCreatorFeesOnChain: (marketId: number) => Promise<boolean>
  claimCreatorSeedOnChain: (marketId: number) => Promise<boolean>
  voteOnResolutionOnChain: (marketId: number, outcomeIndex: number) => Promise<boolean>
  finalizeResolutionVotingOnChain: (marketId: number) => Promise<boolean>
  finalizeProposalVotingOnChain: (marketId: number) => Promise<boolean>
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

const INTERLINK_TESTNET_CHAIN_ID = '19042026'
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3E5936F13e1194380A66c3c1d75D4D7342299CfF"

// NOTE: the deployed contract uses the native chain token (msg.value) for all
// payments — market seeds, proposal fees, and bets. There is no ERC20 token
// involved anywhere in InterPredict.sol, so no approve/allowance step belongs
// in this file. (The old TITL_TOKEN_ADDRESS / ensureTokenAllowance flow has
// been removed for this reason.)

// Market state enum, in the exact order InterPredict.sol declares it —
// these index values MUST match `enum State` in the contract.
const MarketState = {
  Proposed: 0,
  DECVoting: 1,
  Rejected: 2,
  Cancelled: 3,
  Approved: 4,
  Active: 5,
  Closed: 6,
  Unresolved: 7,
  ResReq: 8,
  DECResVoting: 9,
  AdminVer: 10,
  Confirmed: 11,
  Finalized: 12,
  Resolved: 13
} as const

function formatTxError(err: any): string {
  const parts: string[] = []
  if (err?.message) parts.push(err.message)
  if (err?.code !== undefined) parts.push(`code=${err.code}`)
  if (err?.reason) parts.push(`reason=${err.reason}`)
  if (err?.data && typeof err.data === 'string') parts.push(`data=${err.data}`)
  if (err?.info?.error?.message) parts.push(`rpc=${err.info.error.message}`)
  if (err?.info?.responseStatus) parts.push(`httpStatus=${err.info.responseStatus}`)
  return parts.length > 0 ? parts.join(' | ') : String(err)
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [historyLogs, setHistoryLogs] = useState<HistoryRecord[]>([])
  const [locale, setLocaleState] = useState<LocaleType>('en')
  const [decMembers, setDecMembers] = useState<string[]>([])

  useEffect(() => {
    const savedLocale = localStorage.getItem('interpredict_lang') as LocaleType
    if (savedLocale) setLocaleState(savedLocale)
  }, [])

  const setLocale = (lang: LocaleType) => {
    setLocaleState(lang)
    localStorage.setItem('interpredict_lang', lang)
  }

  const t = (key: keyof typeof translations['en']) => {
    return translations[locale][key] || translations['en'][key]
  }

  const saveLogToLocalStorage = (
    wallet: string,
    logType: HistoryRecord['type'],
    description: string,
    detail: string,
    status: HistoryRecord['status']
  ) => {
    const storageKey = `interpredict_logs_${wallet.toLowerCase()}`
    const existingLogsRaw = localStorage.getItem(storageKey)
    const logs = existingLogsRaw ? JSON.parse(existingLogsRaw) : []

    const newLog: HistoryRecord = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: logType,
      timestamp: new Date().toLocaleTimeString(),
      description,
      detail,
      status
    }

    const updatedLogs = [newLog, ...logs]
    localStorage.setItem(storageKey, JSON.stringify(updatedLogs))
    setHistoryLogs(updatedLogs)
  }

  useEffect(() => {
    async function checkExistingConnection() {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum)
          const accounts = await provider.listAccounts()
          const cachedConnected = localStorage.getItem('interpredict_connected')

          if (accounts.length > 0 && cachedConnected === 'true') {
            const activeAddress = accounts[0].address
            setWalletAddress(activeAddress)

            const storageKey = `interpredict_logs_${activeAddress.toLowerCase()}`
            const savedLogs = localStorage.getItem(storageKey)
            if (savedLogs) {
              setHistoryLogs(JSON.parse(savedLogs))
            }
          }
        } catch (e) {
          console.error("Session rehydration skipped:", e)
        }
      }
    }
    checkExistingConnection()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          const activeAddress = accounts[0]
          setWalletAddress(activeAddress)
          localStorage.setItem('interpredict_connected', 'true')

          const storageKey = `interpredict_logs_${activeAddress.toLowerCase()}`
          const savedLogs = localStorage.getItem(storageKey)
          setHistoryLogs(savedLogs ? JSON.parse(savedLogs) : [])
        } else {
          setWalletAddress(null)
          setHistoryLogs([])
          localStorage.removeItem('interpredict_connected')
        }
      }

        ; (window as any).ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        ; (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  useEffect(() => {
    if (!walletAddress) return

    const keepTokenWarm = async () => {
      try {
        if (typeof window === 'undefined' || !(window as any).ethereum) return
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum)
        const signer = await browserProvider.getSigner()
        await getValidToken(walletAddress, signer)
      } catch (err: any) {
        console.warn('[Web3Context] Background token keep-warm failed:', err?.message || err)
      }
    }

    keepTokenWarm()
    const intervalId = setInterval(keepTokenWarm, 14 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [walletAddress])

  const verifyNetwork = async (provider: any) => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${Number(INTERLINK_TESTNET_CHAIN_ID).toString(16)}` }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${Number(INTERLINK_TESTNET_CHAIN_ID).toString(16)}`,
              chainName: 'Interlink Testnet',
              nativeCurrency: { name: 'Interlink Token', symbol: 'tITL', decimals: 18 },
              rpcUrls: ['https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'],
              blockExplorerUrls: ['https://testnet-explorer.interlinklabs.ai']
            }]
          })
        } catch (addError) {
          console.error(addError)
        }
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setTxStatus("Error: Web3 Wallet extension not identified.")
      return
    }
    try {
      setTxStatus("Synchronizing credentials...")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      await verifyNetwork((window as any).ethereum)

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setWalletAddress(address)
      localStorage.setItem('interpredict_connected', 'true')

      const storageKey = `interpredict_logs_${address.toLowerCase()}`
      const savedLogs = localStorage.getItem(storageKey)
      if (savedLogs) setHistoryLogs(JSON.parse(savedLogs))

      setTxStatus("Wallet interface integrated successfully.")
    } catch (err: any) {
      setTxStatus(`Connection Error: ${err.message}`)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setHistoryLogs([])
    localStorage.removeItem('interpredict_connected')
    setTxStatus("Wallet session cleared successfully.")
  }

  const getContractInstance = async () => {
    if (!(window as any).ethereum) throw new Error("Wallet not identified")
    if (!walletAddress) throw new Error("Wallet not connected")

    const browserProvider = new ethers.BrowserProvider((window as any).ethereum)
    const signer = await browserProvider.getSigner()
    const accessToken = await getValidToken(walletAddress, signer)

    const rpcUrl = "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc"

    const connection = new ethers.FetchRequest(rpcUrl)
    connection.setHeader("Authorization", `Bearer ${accessToken}`)

    const testnetProvider = new ethers.JsonRpcProvider(connection, undefined, {
      staticNetwork: true
    })

    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, testnetProvider)
    return { contract, provider: testnetProvider }
  }

  const getSignerContract = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error("Wallet not identified")
    }
    if (!walletAddress) {
      throw new Error("Wallet not connected")
    }

    const browserProvider = new ethers.BrowserProvider((window as any).ethereum)
    const signer = await browserProvider.getSigner()
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)
    return { contract, signer }
  }

  // Fetches native tITL balance through our authenticated JsonRpcProvider
  // rather than calling window.ethereum.request('eth_getBalance') directly —
  // MetaMask's own raw RPC calls to the Interlink testnet don't carry the
  // Bearer auth header this chain requires, so they silently fail/404.
  const getWalletBalance = async (address: string): Promise<string> => {
    try {
      const { provider } = await getContractInstance()
      const balance = await provider.getBalance(address)
      return balance.toString()
    } catch (err) {
      console.warn('[Web3Context] getWalletBalance failed:', err)
      return '0'
    }
  }

  const sendTxSafely = async (
    method: string,
    args: any[],
    overrides: { value?: bigint } = {}
  ): Promise<any> => {
    if (
      typeof window === 'undefined' ||
      !(window as any).ethereum
    ) {
      throw new Error('Wallet not identified')
    }

    const { contract, signer } = await getSignerContract()
    const from = await signer.getAddress()

    const populated = await (
      contract[method] as any
    ).populateTransaction(...args, overrides)

    const transactionPayload: Record<string, any> = {
      from,
    }

    for (const [key, value] of Object.entries(populated)) {
      if (value === undefined || value === null) {
        continue
      }

      transactionPayload[key] =
        typeof value === 'bigint'
          ? ethers.toQuantity(value)
          : value
    }

    const txHash: string = await (
      window as any
    ).ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionPayload],
    })

    let rawReceipt: any = null

    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        rawReceipt = await (
          window as any
        ).ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        })
      } catch (receiptError) {
        console.warn(
          `Receipt check ${attempt + 1} failed:`,
          receiptError
        )
      }

      if (rawReceipt) {
        break
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      )
    }

    if (!rawReceipt) {
      throw new Error(
        `Transaction ${txHash} was submitted but was not confirmed within 120 seconds`
      )
    }

    const receiptStatus =
      typeof rawReceipt.status === 'string'
        ? Number.parseInt(rawReceipt.status, 16)
        : Number(rawReceipt.status)

    if (receiptStatus !== 1) {
      throw new Error(
        `Transaction reverted on-chain: ${txHash}`
      )
    }

    return rawReceipt
  }

  const createMarketOnChain = async (
    description: string,
    marketEndTime: number,
    outcomes: string[],
    category: number,
    thumbnailUri: string,
    resolutionCriteria: string
  ): Promise<boolean> => {
    const isTeam = walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992"
    const txType = isTeam ? 'Team Deployment' : 'Market Proposal'

    try {
      setTxStatus("Broadcasting market creation payload...")

      // Struct-based params for both cTM (team) and pM (community)
      const params = {
        q: description,
        d: "",
        cat: category,
        cc: "",
        tu: thumbnailUri,
        ol: outcomes,
        et: marketEndTime,
        rc: resolutionCriteria,
        ev: "",
        pe: ""
      }

      if (isTeam) {
        await sendTxSafely('cTM', [params], { value: ethers.parseEther("10") })
      } else {
        await sendTxSafely('pM', [params], { value: ethers.parseEther("11") })
      }

      setTxStatus(isTeam ? "Team market created and activated!" : "Market proposed! Awaiting DEC review.")
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, txType, description, `Success — Market #${await getNextMarketId()}`, 'Success')
      }
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('createMarketOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, txType, description, `Failed — ${detail}`, 'Failed')
      }
      return false
    }
  }

  const getNextMarketId = async (): Promise<number> => {
    try {
      const { contract } = await getContractInstance()
      const count = await contract.tm() // public uint256 tm — total markets
      return Number(count) - 1
    } catch { return 0 }
  }

  // Submits an off-chain DEC membership request — no wallet signature, no
  // gas. The admin reviews pending requests in the "DEC Requests" tab and
  // approves by calling addD() on-chain themselves via approveDecRequestOnChain.
  const joinDecOnChain = async (): Promise<boolean> => {
    try {
      setTxStatus("Checking DEC membership status...")
      const { contract } = await getContractInstance()

      const isAlreadyMember = await contract.iad(walletAddress)
      if (isAlreadyMember) {
        setTxStatus("Already a registered DEC Committee Member!")
        return true
      }

      setTxStatus("Submitting DEC membership request...")
      const res = await fetch('/api/dec-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress })
      })
      const json = await res.json()

      if (!res.ok) {
        setTxStatus(`Error: ${json.error || 'Failed to submit request'}`)
        return false
      }

      setTxStatus("Request submitted! An admin will review and approve your membership.")
      return false // request submitted, but not yet an actual member
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('joinDecOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  // Admin-only: grants DEC membership on-chain via addD(), then clears the
  // request from the pending list.
  const approveDecRequestOnChain = async (
    address: string
  ): Promise<boolean> => {
    const clearPendingRequest = async () => {
      const response = await fetch('/api/dec-requests', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)

        throw new Error(
          result?.error ||
          'Failed to clear the pending DEC request'
        )
      }
    }

    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid DEC wallet address')
      }

      setTxStatus(
        `Checking DEC membership for ${address}...`
      )

      const { contract } = await getContractInstance()

      const isAlreadyActive = Boolean(
        await contract.iad(address)
      )

      if (isAlreadyActive) {
        await clearPendingRequest()

        setTxStatus(
          `${address} is already an active DEC member. The stale request was removed.`
        )

        return true
      }

      // DEC_ROLE is not public in the deployed Solidity contract,
      // therefore no contract.DEC_ROLE() getter exists.
      const decRole = ethers.keccak256(
        ethers.toUtf8Bytes('DEC_ROLE')
      )

      const alreadyHasRole = Boolean(
        await contract.hasRole(decRole, address)
      )

      console.log('[Web3Context] DEC approval check:', {
        address,
        isAlreadyActive,
        alreadyHasRole,
        decRole,
      })

      if (alreadyHasRole) {
        setTxStatus(
          `Reactivating DEC membership for ${address}...`
        )

        await sendTxSafely('actD', [address])
      } else {
        setTxStatus(
          `Approving DEC membership for ${address}...`
        )

        await sendTxSafely('addD', [address])
      }

      await clearPendingRequest()

      setTxStatus(
        alreadyHasRole
          ? `DEC membership reactivated for ${address}`
          : `DEC membership granted to ${address}`
      )

      return true
    } catch (err: any) {
      const detail = formatTxError(err)

      console.error(
        'approveDecRequestOnChain failed:',
        err
      )

      setTxStatus(`Error: ${detail}`)

      return false
    }
  }


  const castVoteOnChain = async (marketId: number, support: boolean) => {
    const ballotText = support ? 'Voted FOR (Approve)' : 'Voted AGAINST (Reject)'
    try {
      setTxStatus("Transmitting curation vote...")
      const { contract } = await getContractInstance()

      const state = Number(await contract.ms(marketId))
      if (state === MarketState.Proposed) {
        setTxStatus("Entering proposal into DEC voting...")
        await sendTxSafely('ePV', [marketId])
      }

      await sendTxSafely('vOP', [marketId, support ? 1 : 2]) // PVote enum: 0=None, 1=Approve, 2=Reject
      setTxStatus("Ballot submitted on-chain.")

      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Governance Vote', `Vote cast on Proposal #${marketId}`, `Success — ${ballotText}`, 'Success')
      }
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('castVoteOnChain failed:', err)
      setTxStatus(`Voting Error: ${detail}`)
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Governance Vote', `Vote attempt on Proposal #${marketId}`, `Failed — ${detail}`, 'Failed')
      }
    }
  }

  const placeBetOnChain = async (marketId: number, outcomeIndex: number, amount: string): Promise<boolean> => {
    try {
      setTxStatus("Transmitting trade payload...")

      const grossAmount = ethers.parseEther(amount || "0.1")
      const minSharesOut = 1

      // bO() is payable — the bet amount is sent as native-token msg.value,
      // not as an ERC20 transfer. No approve/allowance step needed.
      await sendTxSafely('bO', [marketId, outcomeIndex, minSharesOut], { value: grossAmount })

      setTxStatus("Trade logged on-chain!")

      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Market Trade', `Wager placed on Market #${marketId}`, `Success — Outcome ${outcomeIndex} with ${amount} tITL`, 'Success')
      }
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('placeBetOnChain failed:', err)
      setTxStatus(`Trade Error: ${detail}`)
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Market Trade', `Wager attempt on Market #${marketId}`, `Failed — ${detail}`, 'Failed')
      }
      return false
    }
  }

  const finalizeProposalVotingOnChain = async (marketId: number): Promise<boolean> => {
    try {
      setTxStatus("Finalizing proposal voting...")
      await sendTxSafely('fPV', [marketId])
      setTxStatus("Proposal finalized!")
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('finalizeProposalVotingOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const initializeMarketOnChain = async (marketId: number): Promise<boolean> => {
    // Maps to ePV (enter proposal voting) + fPV (finalize proposal voting)
    try {
      setTxStatus("Entering proposal voting...")
      const { contract } = await getContractInstance()

      const state = Number(await contract.ms(marketId))

      if (state === MarketState.Proposed) {
        await sendTxSafely('ePV', [marketId])
        setTxStatus("Proposal entered voting. Awaiting 24h window or finalization...")
        return true
      } else if (state === MarketState.DECVoting) {
        await sendTxSafely('fPV', [marketId])
        setTxStatus("Proposal voting finalized!")
        return true
      }
      return false
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('initializeMarketOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const claimPayoutOnChain = async (marketId: number): Promise<boolean> => {
    try {
      setTxStatus("Claiming winnings...")
      await sendTxSafely('cW', [marketId])
      setTxStatus("Winnings claimed successfully!")
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Payout', `Winnings claimed on Market #${marketId}`, 'Success', 'Success')
      }
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('claimPayoutOnChain failed:', err)
      setTxStatus(`Claim Error: ${detail}`)
      return false
    }
  }

  const requestResolutionOnChain = async (marketId: number): Promise<boolean> => {
    try {
      setTxStatus("Requesting market resolution...")
      await sendTxSafely('rR', [marketId])
      setTxStatus("Resolution requested! DEC voting open for 3 hours.")
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('requestResolutionOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const resolveMarketOnChain = async (marketId: number, winningOutcome: number): Promise<boolean> => {
    try {
      setTxStatus("Confirming outcome as admin verifier...")
      const { contract } = await getContractInstance()

      const state = Number(await contract.ms(marketId))

      if (state === MarketState.DECResVoting) {
        setTxStatus("Finalizing resolution voting first...")
        await sendTxSafely('fRV', [marketId])
      }

      // Admin verification of the winning outcome
      await sendTxSafely('cO', [marketId, winningOutcome, ""])

      setTxStatus("Outcome confirmed! Finalizing market...")
      await sendTxSafely('fM', [marketId])

      setTxStatus("Market resolved and finalized!")
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('resolveMarketOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const voteOnResolutionOnChain = async (marketId: number, outcomeIndex: number): Promise<boolean> => {
    try {
      setTxStatus("Casting resolution vote...")
      await sendTxSafely('vOR', [marketId, outcomeIndex])
      setTxStatus("Resolution vote cast!")
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('voteOnResolutionOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const finalizeResolutionVotingOnChain = async (marketId: number): Promise<boolean> => {
    try {
      setTxStatus("Finalizing resolution voting...")
      await sendTxSafely('fRV', [marketId])
      setTxStatus("Resolution voting finalized!")
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('finalizeResolutionVotingOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const claimDecRewardsOnChain = async (): Promise<boolean> => {
    try {
      setTxStatus("Claiming DEC rewards...")
      await sendTxSafely('cDR', [])
      setTxStatus("DEC rewards claimed!")
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('claimDecRewardsOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const claimCreatorFeesOnChain = async (marketId: number): Promise<boolean> => {
    try {
      setTxStatus("Claiming creator fees...")
      await sendTxSafely('cCF', [marketId])
      setTxStatus("Creator fees claimed!")
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('claimCreatorFeesOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const claimCreatorSeedOnChain = async (marketId: number): Promise<boolean> => {
    try {
      setTxStatus("Claiming creator seed...")
      await sendTxSafely('cCS', [marketId])
      setTxStatus("Creator seed claimed!")
      return true
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('claimCreatorSeedOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  return (
    <Web3Context.Provider value={{
      walletAddress, decMembers, txStatus, setTxStatus, historyLogs,
      locale, setLocale, t,
      connectWallet, disconnectWallet, getWalletBalance,
      createMarketOnChain, joinDecOnChain, approveDecRequestOnChain, castVoteOnChain, placeBetOnChain,
      initializeMarketOnChain, claimPayoutOnChain, requestResolutionOnChain,
      resolveMarketOnChain, claimDecRewardsOnChain,
      claimCreatorFeesOnChain, claimCreatorSeedOnChain,
      voteOnResolutionOnChain, finalizeResolutionVotingOnChain,
      finalizeProposalVotingOnChain
    }}>
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) throw new Error("useWeb3 must be managed via Web3Provider")
  return context
}