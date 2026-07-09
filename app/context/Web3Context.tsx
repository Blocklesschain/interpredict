'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'

interface Web3ContextType {
  walletAddress: string | null
  txStatus: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  createMarketOnChain: (description: string) => Promise<boolean>
  joinDecOnChain: () => Promise<boolean>
  castVoteOnChain: (marketId: number, support: boolean) => Promise<void>
  placeBetOnChain: (marketId: number, outcome: number, amount: string) => Promise<void>
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

// Your exact deployed contract parameters
const INTERLINK_TESTNET_CHAIN_ID = '0x5d' // Chain ID 93 (Update this hex if Interlink uses a different specific ID)
const CONTRACT_ADDRESS = "0x244130F9BcaC8642d4213742D837eFD1C2d7B12b"
const CONTRACT_ABI = [
  "function marketCount() view returns (uint256)",
  "function createMarket(string description) external payable",
  "function createMarketByTeam(string description) external",
  "function joinDEC() external payable",
  "function castVote(uint256 marketId, bool support) external",
  "function placeWager(uint256 marketId, uint8 outcome) external payable",
  "function balanceOf(address account) view returns (uint256)"
]

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)

  // Enforce Interlink Testnet switching
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
              rpcUrls: ['https://testnet-rpc.interlinklabs.ai'], // Replace with your true RPC node URL
              blockExplorerUrls: ['https://testnet-explorer.interlinklabs.ai']
            }]
          })
        } catch (addError) {
          console.error("Could not append Interlink network matrix:", addError)
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
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
  }

  const createMarketOnChain = async (description: string): Promise<boolean> => {
    try {
      setTxStatus("Broadcasting market initialization payload...")
      const contract = await getContractInstance()

      let tx;
      // If team wallet connects, bypass the fee on-chain using corresponding function execution mapping
      if (walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992") {
        tx = await contract.createMarketByTeam(description)
      } else {
        tx = await contract.createMarket(description, { value: ethers.parseEther("1.0") })
      }

      setTxStatus("Awaiting on-chain verification blocks...")
      await tx.wait()
      setTxStatus("Market structure deployed securely to Interlink registry!")
      return true
    } catch (err: any) {
      setTxStatus(`Deployment Cancelled: ${err.message}`)
      return false
    }
  }

  const joinDecOnChain = async (): Promise<boolean> => {
    try {
      setTxStatus("Checking balance parameters for bond collateral requirement...")
      const contract = await getContractInstance()

      // Token balance check constraint verification loop
      const balance = await contract.balanceOf(walletAddress)
      if (balance < ethers.parseEther("500")) {
        setTxStatus("Registration Rejected: Insufficient balance. 500 tITL required.")
        return false
      }

      setTxStatus("Escrowing security bond onto validator layer...")
      const tx = await contract.joinDEC({ value: ethers.parseEther("500") })
      await tx.wait()
      setTxStatus("Node verified! Welcome to the Decentralized Curation Committee.")
      return true
    } catch (err: any) {
      setTxStatus(`Verification Cancelled: ${err.message}`)
      return false
    }
  }

  const castVoteOnChain = async (marketId: number, support: boolean) => {
    try {
      setTxStatus("Transmitting curation consensus weight...")
      const contract = await getContractInstance()
      const tx = await contract.castVote(marketId, support)
      await tx.wait()
      setTxStatus("Ballot updated successfully on-chain.")
    } catch (err: any) {
      setTxStatus(`Voting Error: ${err.message}`)
    }
  }

  const placeBetOnChain = async (marketId: number, outcome: number, amount: string) => {
    try {
      setTxStatus("Transmitting position collateral payload...")
      const contract = await getContractInstance()
      const tx = await contract.placeWager(marketId, outcome, { value: ethers.parseEther(amount) })
      await tx.wait()
      setTxStatus("Trade position logged securely inside on-chain pool matrix!")
    } catch (err: any) {
      setTxStatus(`Execution Error: ${err.message}`)
    }
  }

  return (
    <Web3Context.Provider value={{ walletAddress, txStatus, connectWallet, disconnectWallet, createMarketOnChain, joinDecOnChain, castVoteOnChain, placeBetOnChain }}>
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) throw new Error("useWeb3 must be managed via Web3Provider")
  return context
}