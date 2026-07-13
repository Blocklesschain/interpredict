'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { translations, LocaleType } from './translations'

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
  decMembers: string[]
  locale: 'en' | 'zh' | 'es' | 'fr'
  setLocale: (lang: 'en' | 'zh' | 'es' | 'fr') => void
  t: (key: keyof typeof translations['en']) => string
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  createMarketOnChain: (description: string) => Promise<boolean>
  joinDecOnChain: () => Promise<boolean>
  castVoteOnChain: (marketId: number, support: boolean) => Promise<void>
  placeBetOnChain: (marketId: number, outcome: number, amount: string) => Promise<void>
}


const Web3Context = createContext<Web3ContextType | undefined>(undefined)

const INTERLINK_TESTNET_CHAIN_ID = '19042026'
const CONTRACT_ADDRESS = process.env.PUBLIC_CONTRACT_ADDRESS! || "0xD6CA8AB227dE04be92e3c0076c54BD9d60705Da2";

const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_oracle",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "CreatorYieldClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "decMember",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "DecRewardsClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "marketEndTime",
        "type": "uint256"
      }
    ],
    "name": "MarketInitialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "question",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "votingEndTime",
        "type": "uint256"
      }
    ],
    "name": "MarketProposed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum InterPredict.Outcome",
        "name": "winningOutcome",
        "type": "uint8"
      }
    ],
    "name": "MarketResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOracle",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOracle",
        "type": "address"
      }
    ],
    "name": "OracleUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "trader",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "PayoutClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "trader",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isYes",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "SharePurchased",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "CREATOR_FEE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MARKET_STAKE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PLATFORM_FEE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VOTING_DURATION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_marketId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_isYes",
        "type": "bool"
      }
    ],
    "name": "buyShares",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_marketId",
        "type": "uint256"
      }
    ],
    "name": "claimCreatorYield",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimDecRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_marketId",
        "type": "uint256"
      }
    ],
    "name": "claimPayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_question",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_marketEndTime",
        "type": "uint256"
      }
    ],
    "name": "createActiveMarket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decPool",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "decRewardsClaimedTracker",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasVotedOnCuration",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_marketId",
        "type": "uint256"
      }
    ],
    "name": "initializeMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isDecMember",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "joinCommittee",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "markets",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "question",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "marketEndTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "votingEndTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalYesPool",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalNoPool",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "votesForActive",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "votesAgainstActive",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "noShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oracle",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_question",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_marketEndTime",
        "type": "uint256"
      }
    ],
    "name": "proposeMarket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_marketId",
        "type": "uint256"
      },
      {
        "internalType": "enum InterPredict.Outcome",
        "name": "_winningOutcome",
        "type": "uint8"
      }
    ],
    "name": "resolveMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalDecMembers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalMarkets",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_newOracle",
        "type": "address"
      }
    ],
    "name": "updateOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_marketId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_support",
        "type": "bool"
      }
    ],
    "name": "voteOnCuration",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "yesShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [historyLogs, setHistoryLogs] = useState<HistoryRecord[]>([])

  const [locale, setLocaleState] = useState<LocaleType>('en')

  // Hydrate language preference from localStorage on boot safely
  useEffect(() => {
    const savedLocale = localStorage.getItem('interpredict_lang') as LocaleType
    if (savedLocale) setLocaleState(savedLocale)
  }, [])

  const setLocale = (lang: LocaleType) => {
    setLocaleState(lang)
    localStorage.setItem('interpredict_lang', lang)
  }

  // Simple translation look-up function helper
  const t = (key: keyof typeof translations['en']) => {
    return translations[locale][key] || translations['en'][key]
  }


  // 🔄 Persistent Hydration Session Loop
  useEffect(() => {
    async function checkExistingConnection() {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum)
          const accounts = await provider.listAccounts()
          const cachedConnected = localStorage.getItem('interpredict_connected')

          if (accounts.length > 0 && cachedConnected === 'true') {
            setWalletAddress(accounts[0].address)
          }
        } catch (e) {
          console.error("Session rehydration skipped:", e)
        }
      }
    }

    const savedLocale = localStorage.getItem('interpredict_lang') as LocaleType
    if (savedLocale) {
      setLocaleState(savedLocale)
    } else {
      setLocaleState('en') //English as the application default
      localStorage.setItem('interpredict_lang', 'en')
    }
    checkExistingConnection()
  }, [])

  // Handle automatic account switching natively via MetaMask events
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          localStorage.setItem('interpredict_connected', 'true')
        } else {
          setWalletAddress(null)
          localStorage.removeItem('interpredict_connected')
        }
      }
        ; (window as any).ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        ; (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

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
        params: [{ chainId: INTERLINK_TESTNET_CHAIN_ID || 19042026 }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: INTERLINK_TESTNET_CHAIN_ID || 19042026,
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
      setTxStatus("Wallet interface integrated successfully.")
    } catch (err: any) {
      setTxStatus(`Connection Error: ${err.message}`)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    localStorage.removeItem('interpredict_connected')
    setTxStatus("Wallet session cleared successfully.")
  }

  const getContractInstance = async () => {
    if (!(window as any).ethereum) throw new Error("Wallet not identified")

    // 1. Instantiate the browser provider to capture the user's active signer credentials
    const walletProvider = new ethers.BrowserProvider((window as any).ethereum)
    const signer = await walletProvider.getSigner()

    // Force a direct fallback provider pointing explicitly to Interlink Testnet RPC URL.
    // Prevent the Interlink In-App Browser from forcing Chain ID 1 (Ethereum) behavior.
    const testnetProvider = new ethers.JsonRpcProvider("https://evm-rpc.test-net.interlinklabs.ai/v1/rpc")

    // 3. Attach the contract instance using your globally defined variables
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

    return { contract, provider: testnetProvider }
  }

  const createMarketOnChain = async (description: string): Promise<boolean> => {
    const isTeam = walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992";
    const txType = isTeam ? 'Team Deployment' : 'Market Proposal';
    const feeText = isTeam ? '0.00 tITL (Bypassed)' : '1.00 tITL'; // 🔄 Updated display text to 1.00 tITL

    try {
      setTxStatus("Broadcasting market initialization payload...")
      const { contract } = await getContractInstance()

      // 🕒 Generate a default 7-day end time timestamp to satisfy the new smart contract parameters
      const marketEndTime = Math.floor(Date.now() / 1000) + (86400 * 7);

      let tx;
      if (isTeam) {
        // 🚀 Team address bypasses the escrow requirement with low gas pricing
        tx = await contract.createActiveMarket(description, marketEndTime, {
          gasLimit: 250000,
          gasPrice: ethers.parseUnits("5", "gwei")
        })
      } else {
        // 🔄 Adjusted value threshold down to 1.0 ethers with low gas pricing
        tx = await contract.proposeMarket(description, marketEndTime, {
          value: ethers.parseEther("1.0"),
          gasLimit: 250000,
          gasPrice: ethers.parseUnits("5", "gwei")
        })
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

  const [decMembers, setDecMembers] = useState<string[]>([
    // Prefill with some mock assessor addresses for your presentation demo!
    "0x9A54b9d038eF3c0076c54BD9d60705Da25A12bc4",
    "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  ])

  const joinDecOnChain = async (): Promise<boolean> => {
    try {
      setTxStatus("Reading native node balance parameters...")
      const { contract, provider } = await getContractInstance()

      const balance = await provider.getBalance(walletAddress!);

      setTxStatus("Processing DEC Committee registration payment...")

      // 🔄 Injected low gasPrice configuration to cap transaction fees safely
      const tx = await contract.joinCommittee({
        value: ethers.parseEther("0.1"),
        gasLimit: 250000,
        gasPrice: ethers.parseUnits("5", "gwei")
      })
      await tx.wait()

      setTxStatus("Node verified! Welcome to the Decentralized Curation Committee.")

      // 🔄 Swapped type back to 'Committee Bond' to clear the TypeScript error matrix
      appendLog('Committee Bond', 'Request to join DEC Committee', 'Success — 0.10 tITL routed to treasury registry contract', 'Success')

      // 👥Append the current user's address to the DEC members state directory
      if (walletAddress) {
        setDecMembers((prev) => [...prev, walletAddress])
      }

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

      // 🔄 Fixed: Added low gasPrice configuration to protect your token balance
      const tx = await contract.voteOnCuration(marketId, support, {
        gasLimit: 250000,
        gasPrice: ethers.parseUnits("5", "gwei")
      })
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
    const isYes = outcome === 0; // Convert the number index to a clean boolean for the new contract signature

    try {
      setTxStatus("Transmitting position collateral payload...")
      const { contract } = await getContractInstance()

      // 🔄 Fixed: Added low gasPrice configuration to protect your token balance
      const tx = await contract.buyShares(marketId, isYes, {
        value: ethers.parseEther(amount),
        gasLimit: 250000,
        gasPrice: ethers.parseUnits("5", "gwei")
      })
      await tx.wait()
      setTxStatus("Trade position logged securely inside on-chain pool matrix!")
      appendLog('Market Trade', `Wager placed on Pool #${marketId}`, `Success — Predicted ${targetSide} with ${amount} tITL`, 'Success')
    } catch (err: any) {
      setTxStatus(`Execution Error: ${err.message}`)
      appendLog('Market Trade', `Wager placed on Pool #${marketId}`, `Failed — ${targetSide} allocation timed out`, 'Failed')
    }
  }

  return (
    <Web3Context.Provider value={{ walletAddress, decMembers, txStatus, historyLogs, locale, setLocale, t, connectWallet, disconnectWallet, createMarketOnChain, joinDecOnChain, castVoteOnChain, placeBetOnChain }}>
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) throw new Error("useWeb3 must be managed via Web3Provider")
  return context
}