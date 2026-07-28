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
  createMarketOnChain: (description: string, marketEndTime: number, outcomes: string[], category: number, thumbnailUri: string, resolutionCriteria: string) => Promise<boolean>
  joinDecOnChain: () => Promise<boolean>
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
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x8c69b2D0A1C89fd3C6aD64e1Be3536FAF63b55b6"
const TITL_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TITL_TOKEN_ADDRESS || "0x..."

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

      ;(window as any).ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        ;(window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged)
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
    if (!(window as any).ethereum) throw new Error("Wallet not identified")
    if (!walletAddress) throw new Error("Wallet not connected")

    const browserProvider = new ethers.BrowserProvider((window as any).ethereum)
    const signer = await browserProvider.getSigner()
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)
    return { contract, signer }
  }

  const getTokenContract = async (signer?: ethers.Signer) => {
    if (!(window as any).ethereum) throw new Error("Wallet not identified")
    const provider = new ethers.BrowserProvider((window as any).ethereum)
    const tokenSigner = signer || await provider.getSigner()
    const tokenContract = new ethers.Contract(TITL_TOKEN_ADDRESS, [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function balanceOf(address account) view returns (uint256)"
    ], tokenSigner)
    return tokenContract
  }

  const ensureTokenAllowance = async (amount: bigint) => {
    if (!(window as any).ethereum) throw new Error("Wallet not identified")
    if (!walletAddress) throw new Error("Wallet not connected")

    const provider = new ethers.BrowserProvider((window as any).ethereum)
    const signer = await provider.getSigner()
    const tokenContract = await getTokenContract(signer)

    const allowance = await tokenContract.allowance(walletAddress, CONTRACT_ADDRESS)
    if (allowance < amount) {
      setTxStatus("Approving tITL token spending...")
      const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, amount)
      await approveTx.wait()
      setTxStatus("Token approval confirmed.")
    }
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
      const { contract } = await getContractInstance()
      const signerContract = (await getSignerContract()).contract

      // Ensure token allowance for 11 tITL (community) or seed amount (team)
      if (!isTeam) {
        await ensureTokenAllowance(ethers.parseEther("11"))
      } else {
        await ensureTokenAllowance(ethers.parseEther("10"))
      }

      const iface = new ethers.Interface(contractABI)

      // Use struct-based params for both functions
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

      let tx
      if (isTeam) {
        tx = await signerContract.cTM(params, { value: ethers.parseEther("10") })
      } else {
        tx = await signerContract.pM(params, { value: ethers.parseEther("11") })
      }

      setTxStatus("Awaiting on-chain confirmation...")
      await tx.wait()

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
      const count = await contract.totalMarkets()
      return Number(count) - 1
    } catch { return 0 }
  }

  const joinDecOnChain = async (): Promise<boolean> => {
    try {
      setTxStatus("Joining DEC Committee...")
      const { contract, provider } = await getContractInstance()
      const { signer } = await getSignerContract()

      const isAlreadyMember = await contract.isActiveDecMember(walletAddress)
      if (isAlreadyMember) {
        setTxStatus("Already a registered DEC Committee Member!")
        return true
      }

      setTxStatus("Processing DEC Committee registration...")
      // DEC membership is granted by admin via addDecMember() now
      setTxStatus("DEC membership requires admin approval. Contact the team to add you.")
      return false
    } catch (err: any) {
      const detail = formatTxError(err)
      console.error('joinDecOnChain failed:', err)
      setTxStatus(`Error: ${detail}`)
      return false
    }
  }

  const castVoteOnChain = async (marketId: number, support: boolean) => {
    const ballotText = support ? 'Voted FOR (Approve)' : 'Voted AGAINST (Reject)'
    try {
      setTxStatus("Transmitting curation vote...")
      const { contract } = await getContractInstance()
      const signerContract = (await getSignerContract()).contract

      // Check proposal voting state - may need to enter voting first
      const market = await contract.markets(marketId)
      if (Number(market.state) === 3) { // Proposed (0 index in new enum is 3 for Proposed state)
        // State 3 = Proposed, need to enter voting first
        setTxStatus("Entering proposal into DEC voting...")
        const enterTx = await signerContract.enterProposalVoting(marketId)
        await enterTx.wait()
      }

      const tx = await signerContract.voteOnProposal(
        marketId,
        support ? 1 : 2 // 1=Approve, 2=Reject (0=None)
      )
      setTxStatus("Ballot submitted on-chain.")
      await tx.wait()

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
      const { contract } = await getContractInstance()
      const signerContract = (await getSignerContract()).contract

      const grossAmount = ethers.parseEther(amount || "0.1")
      const minSharesOut = 1

      // Ensure token allowance
      await ensureTokenAllowance(grossAmount)

      const tx = await signerContract.buyOutcome(marketId, outcomeIndex, grossAmount, minSharesOut)

      setTxStatus("Trade logged on-chain!")
      await tx.wait()

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
      const signerContract = (await getSignerContract()).contract
      const tx = await signerContract.finalizeProposalVoting(marketId)
      await tx.wait()
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
    // In the new contract, this maps to enterProposalVoting + finalizeProposalVoting
    try {
      setTxStatus("Entering proposal voting...")
      const { contract } = await getContractInstance()
      const signerContract = (await getSignerContract()).contract

      const market = await contract.markets(marketId)
      const state = Number(market.state)

      if (state === 3) { // Proposed
        const enterTx = await signerContract.enterProposalVoting(marketId)
        await enterTx.wait()
        setTxStatus("Proposal entered voting. Awaiting 24h window or finalization...")
        return true
      } else if (state === 4) { // DECProposalVoting
        const finTx = await signerContract.finalizeProposalVoting(marketId)
        await finTx.wait()
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
      const signerContract = (await getSignerContract()).contract
      const tx = await signerContract.claimWinnings(marketId)
      await tx.wait()
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
      const signerContract = (await getSignerContract()).contract
      const tx = await signerContract.requestResolution(marketId)
      await tx.wait()
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
      const signerContract = (await getSignerContract()).contract

      // Check state - if in DECResolutionVoting, finalize first
      const market = await contract.markets(marketId)
      const state = Number(market.state)

      if (state === 9) { // DECResolutionVoting
        setTxStatus("Finalizing resolution voting first...")
        const finTx = await signerContract.finalizeResolutionVoting(marketId)
        await finTx.wait()
      }

      // Now confirm outcome (admin verification)
      const tx = await signerContract.confirmOutcome(marketId, winningOutcome, "")
      await tx.wait()

      setTxStatus("Outcome confirmed! Finalizing market...")
      const finalTx = await signerContract.finalizeMarket(marketId)
      await finalTx.wait()

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
      const signerContract = (await getSignerContract()).contract
      const tx = await signerContract.voteOnResolution(marketId, outcomeIndex)
      await tx.wait()
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
      const signerContract = (await getSignerContract()).contract
      const tx = await signerContract.finalizeResolutionVoting(marketId)
      await tx.wait()
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
      const signerContract = (await getSignerContract()).contract
      const tx = await signerContract.claimDecRewards()
      await tx.wait()
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
      const signerContract = (await getSignerContract()).contract
      const tx = await signerContract.claimCreatorFees(marketId)
      await tx.wait()
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
      const signerContract = (await getSignerContract()).contract
      const tx = await signerContract.claimCreatorSeed(marketId)
      await tx.wait()
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
      connectWallet, disconnectWallet,
      createMarketOnChain, joinDecOnChain, castVoteOnChain, placeBetOnChain,
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