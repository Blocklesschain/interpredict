'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'

export interface HistoryRecord {
  id: string
  type: 'Market Proposal' | 'Team Deployment' | 'Market Trade' | 'Committee Bond' | 'Governance Vote'
  description: string
  detail: string
  status: 'Pending' | 'Success' | 'Failed'
  timestamp: string
}

interface Web3ContextType {
  walletAddress: string | null
  txStatus: string | null
  historyLogs: HistoryRecord[]
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  createMarketOnChain: (description: string) => Promise<boolean>
  joinDecOnChain: () => Promise<boolean>
  castVoteOnChain: (marketId: number, support: boolean) => Promise<void>
  placeBetOnChain: (marketId: number, outcome: number, amount: string) => Promise<void>
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

const INTERLINK_TESTNET_CHAIN_ID = '0x5d'
const CONTRACT_ADDRESS = "0x244130F9BcaC8642d4213742D837eFD1C2d7B12b"

// Fixed ABI: Removed non-existent balanceOf method to stop CALL_EXCEPTIONS
const CONTRACT_ABI = [
  "function marketCount() view returns (uint256)",
  "function createMarket(string description) external payable",
  "function createMarketByTeam(string description) external",
  "function joinDEC() external payable",
  "function castVote(uint256 marketId, bool support) external",
  "function placeWager(uint256 marketId, uint8 outcome) external payable"
]

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [historyLogs, setHistoryLogs] = useState<HistoryRecord[]>([])

  const appendLog = (type: HistoryRecord['type'], description: string, detail: string, status: HistoryRecord['status']) => {
    const newLog: HistoryRecord = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      type,
      description,
      detail,
      status,
      timestamp: new Date().toLocaleTimeString()
    }
    setHistoryLogs(prev => [newLog, ...prev])
  }

  const verifyNetwork = async (provider: any) => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: INTERLINK_TESTNET_CHAIN_ID }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: INTERLINK_TESTNET_CHAIN_ID,
              chainName: 'Interlink Testnet',
              nativeCurrency: { name: 'Interlink Token', symbol: 'tITL', decimals: 18 },
              rpcUrls: ['https://testnet-rpc.interlinklabs.ai'],
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
      setTxStatus("Wallet interface integrated successfully.")
    } catch (err: any) {
      setTxStatus(`Connection Error: ${err.message}`)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setTxStatus("Wallet session cleared successfully.")
  }

  const getContractInstance = async () => {
    if (!(window as any).ethereum) throw new Error("Wallet not identified")
    const provider = new ethers.BrowserProvider((window as any).ethereum)
    const signer = await provider.getSigner()
    return { contract: new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer), provider }
  }

  const createMarketOnChain = async (description: string): Promise<boolean> => {
    const isTeam = walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992";
    const txType = isTeam ? 'Team Deployment' : 'Market Proposal';
    const feeText = isTeam ? '0.00 tITL (Bypassed)' : '1.00 tITL';

    try {
      setTxStatus("Broadcasting market initialization payload...")
      const { contract } = await getContractInstance()

      let tx;
      if (isTeam) {
        tx = await contract.createMarketByTeam(description)
      } else {
        tx = await contract.createMarket(description, { value: ethers.parseEther("1.0") })
      }

      setTxStatus("Awaiting on-chain verification blocks...")
      await tx.wait()
      setTxStatus("Market structure deployed securely to Interlink registry!")
      appendLog(txType, description, `Success — Fee: ${feeText}`, 'Success')
      return true
    } catch (err: any) {
      setTxStatus(`Deployment Cancelled: ${err.message}`)
      appendLog(txType, description, `Failed — RPC Error or Rejection`, 'Failed')
      return false
    }
  }

  const joinDecOnChain = async (): Promise<boolean> => {
    try {
      setTxStatus("Reading native node balance parameter parameters...")
      const { contract, provider } = await getContractInstance()

      // FIX: Check raw native wallet balance from the node directly to stop the CALL_EXCEPTION
      const balance = await provider.getBalance(walletAddress!)
      if (balance < ethers.parseEther("500")) {
        setTxStatus("Registration Rejected: Insufficient balance. 500 tITL required.")
        appendLog('Committee Bond', 'Request to join DEC Committee', 'Failed — Insufficient tITL balance parameters', 'Failed')
        return false
      }

      setTxStatus("Escrowing security bond onto validator layer...")
      const tx = await contract.joinDEC({ value: ethers.parseEther("500") })
      await tx.wait()
      setTxStatus("Node verified! Welcome to the Decentralized Curation Committee.")
      appendLog('Committee Bond', 'Request to join DEC Committee', 'Success — 500.00 tITL locked into validation contract registry', 'Success')
      return true
    } catch (err: any) {
      setTxStatus(`Verification Cancelled: ${err.message}`)
      appendLog('Committee Bond', 'Request to join DEC Committee', 'Failed — Transaction execution terminated', 'Failed')
      return false
    }
  }

  const castVoteOnChain = async (marketId: number, support: boolean) => {
    const ballotText = support ? 'Voted FOR' : 'Voted AGAINST';
    try {
      setTxStatus("Transmitting curation consensus weight...")
      const { contract } = await getContractInstance()
      const tx = await contract.castVote(marketId, support)
      await tx.wait()
      setTxStatus("Ballot updated successfully on-chain.")
      appendLog('Governance Vote', `Vote cast on Proposal ID #${marketId}`, `Success — ${ballotText}`, 'Success')
    } catch (err: any) {
      setTxStatus(`Voting Error: ${err.message}`)
      appendLog('Governance Vote', `Vote cast on Proposal ID #${marketId}`, `Failed — ${err.message.slice(0, 40)}...`, 'Failed')
    }
  }

  const placeBetOnChain = async (marketId: number, outcome: number, amount: string) => {
    const targetSide = outcome === 0 ? 'YES' : 'NO';
    try {
      setTxStatus("Transmitting position collateral payload...")
      const { contract } = await getContractInstance()
      const tx = await contract.placeWager(marketId, outcome, { value: ethers.parseEther(amount) })
      await tx.wait()
      setTxStatus("Trade position logged securely inside on-chain pool matrix!")
      appendLog('Market Trade', `Wager placed on Pool #${marketId}`, `Success — Predicted ${targetSide} with ${amount} tITL`, 'Success')
    } catch (err: any) {
      setTxStatus(`Execution Error: ${err.message}`)
      appendLog('Market Trade', `Wager placed on Pool #${marketId}`, `Failed — ${targetSide} allocation timed out`, 'Failed')
    }
  }

  return (
    <Web3Context.Provider value={{ walletAddress, txStatus, historyLogs, connectWallet, disconnectWallet, createMarketOnChain, joinDecOnChain, castVoteOnChain, placeBetOnChain }}>
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) throw new Error("useWeb3 must be managed via Web3Provider")
  return context
}