'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'

interface Web3ContextType {
  walletAddress: string
  txStatus: string
  isConnecting: boolean
  connectWallet: () => Promise<boolean>
  disconnectWallet: () => void
  placeBet: (marketId: number, outcomeIndex: number, stakeAmount: string) => Promise<void>
  createMarketProposal: (description: string) => Promise<void>
  joinDECCommittee: () => Promise<void>
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export const CONTRACT_ADDRESS = "0x244130F9BcaC8642d4213742D837eFD1C2d7B12b"
export const CONTRACT_ABI = [
  "function oracleAddress() view returns (address)",
  "function marketCount() view returns (uint256)",
  "function betOnOutcome(uint256 marketId, uint256 outcomeIndex) payable",
  "function createMarket(string description, string[] outcomes, uint256 votingEndTime, uint256 marketEndTime, uint256 initialAmmLiquidity) payable",
  "function claimPayout(uint256 marketId)"
]

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [txStatus, setTxStatus] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  // Auto-detect wallet changes or persistence safely with TypeScript
  useEffect(() => {
    const customWindow = typeof window !== 'undefined' ? (window as any) : null

    if (customWindow && customWindow.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        setWalletAddress(accounts[0] || "")
      }

      customWindow.ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        if (customWindow.ethereum && customWindow.ethereum.removeListener) {
          customWindow.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [])

  const connectWallet = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert("No Web3 wallet detected! Please install MetaMask or Rabby.")
      return false
    }
    try {
      setIsConnecting(true)
      const accounts: string[] = await (window as any).ethereum.request({ method: "eth_requestAccounts" })
      setWalletAddress(accounts[0])
      setIsConnecting(false)
      return true
    } catch (error) {
      console.error("Wallet connection rejected:", error)
      setIsConnecting(false)
      return false
    }
  }

  const disconnectWallet = () => {
    setWalletAddress("")
    setTxStatus("")
  }

  const placeBet = async (marketId: number, outcomeIndex: number, stakeAmount: string) => {
    if (typeof window === 'undefined' || !(window as any).ethereum || !walletAddress) {
      alert("Please connect your wallet first!")
      return
    }
    try {
      setTxStatus("Confirm transaction in your wallet...")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      const tx = await contract.betOnOutcome(marketId, outcomeIndex, {
        value: ethers.parseEther(stakeAmount)
      })
      setTxStatus("Transaction processing on-chain... ⏳")
      await tx.wait()
      setTxStatus("🎉 Prediction submitted successfully!")
    } catch (error) {
      console.error("Transaction failed:", error)
      setTxStatus("❌ Transaction rejected or failed.")
    }
  }

  // Placeholder actions for core protocol mechanisms to be wired to extensions later
  const createMarketProposal = async (description: string) => {
    console.log("Proposing market description sequence:", description)
    setTxStatus("Processing proposal deposit payload...")
  }

  const joinDECCommittee = async () => {
    console.log("Registering validator key into curation pool registry")
    setTxStatus("Processing DEC validation staking token lock...")
  }

  return (
    <Web3Context.Provider
      value={{
        walletAddress,
        txStatus,
        isConnecting,
        connectWallet,
        disconnectWallet,
        placeBet,
        createMarketProposal,
        joinDECCommittee
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) throw new Error("useWeb3 must be used within a Web3Provider")
  return context
}