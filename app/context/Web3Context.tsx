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
  createMarketOnChain: (description: string, marketEndTime: number) => Promise<boolean>
  joinDecOnChain: () => Promise<boolean>
  castVoteOnChain: (marketId: number, support: boolean) => Promise<void>
  placeBetOnChain: (marketId: number, outcome: number, amount: string) => Promise<void>
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

const INTERLINK_TESTNET_CHAIN_ID = '19042026'
const CONTRACT_ADDRESS = "0x9530477f41bA8e6272251376389d09Dd490CF38e";

const CONTRACT_ABI = {
  "_format": "hh3-artifact-1",
  "contractName": "InterPredict",
  "sourceName": "contracts/InterPredict.sol",
  "abi": [
    {
      "inputs": [{ "internalType": "address", "name": "_oracle", "type": "address" }],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
        { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
        { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "CreatorYieldClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "decMember", "type": "address" },
        { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "DecRewardsClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
        { "indexed": false, "internalType": "uint256", "name": "marketEndTime", "type": "uint256" }
      ],
      "name": "MarketInitialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
        { "indexed": false, "internalType": "string", "name": "question", "type": "string" },
        { "indexed": false, "internalType": "uint256", "name": "votingEndTime", "type": "uint256" }
      ],
      "name": "MarketProposed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
        { "indexed": false, "internalType": "enum InterPredict.Outcome", "name": "winningOutcome", "type": "uint8" }
      ],
      "name": "MarketResolved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
        { "indexed": false, "internalType": "string", "name": "question", "type": "string" },
        { "indexed": false, "internalType": "uint256", "name": "marketEndTime", "type": "uint256" }
      ],
      "name": "OracleResolutionRequested",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "previousOracle", "type": "address" },
        { "indexed": true, "internalType": "address", "name": "newOracle", "type": "address" }
      ],
      "name": "OracleUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
        { "indexed": true, "internalType": "address", "name": "trader", "type": "address" },
        { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "PayoutClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
        { "indexed": true, "internalType": "address", "name": "trader", "type": "address" },
        { "indexed": false, "internalType": "bool", "name": "isYes", "type": "bool" },
        { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "SharePurchased",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "CREATOR_FEE_BPS",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEC_POOL_FEE_BPS",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MARKET_STAKE",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "TEAM_BASE_FEE_BPS",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "TEAM_EXCLUSIVE_FEE_BPS",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "TOTAL_PLATFORM_FEE_BPS",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "VOTING_DURATION",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "_marketId", "type": "uint256" },
        { "internalType": "bool", "name": "_isYes", "type": "bool" }
      ],
      "name": "buyShares",
      "outputs": [],
      "stateMutability": "payable",
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
      "inputs": [{ "internalType": "uint256", "name": "_marketId", "type": "uint256" }],
      "name": "claimPayout",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "string", "name": "_question", "type": "string" },
        { "internalType": "uint256", "name": "_marketEndTime", "type": "uint256" }
      ],
      "name": "createActiveMarket",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decPool",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "name": "decRewardsClaimedTracker",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "", "type": "uint256" },
        { "internalType": "address", "name": "", "type": "address" }
      ],
      "name": "hasVotedOnCuration",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "_marketId", "type": "uint256" }],
      "name": "initializeMarket",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "name": "isDecMember",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
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
      "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "name": "markets",
      "outputs": [
        { "internalType": "uint256", "name": "id", "type": "uint256" },
        { "internalType": "string", "name": "question", "type": "string" },
        { "internalType": "uint256", "name": "marketEndTime", "type": "uint256" },
        { "internalType": "uint256", "name": "votingEndTime", "type": "uint256" },
        { "internalType": "uint256", "name": "totalYesPool", "type": "uint256" },
        { "internalType": "uint256", "name": "totalNoPool", "type": "uint256" },
        { "internalType": "uint256", "name": "state", "type": "uint8" },
        { "internalType": "uint256", "name": "winningOutcome", "type": "uint8" },
        { "internalType": "address", "name": "creator", "type": "address" },
        { "internalType": "bool", "name": "creatorFeeClaimed", "type": "bool" },
        { "internalType": "uint256", "name": "votesForActive", "type": "uint256" },
        { "internalType": "uint256", "name": "votesAgainstActive", "type": "uint256" },
        { "internalType": "bool", "name": "oracleResolutionRequested", "type": "bool" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "", "type": "uint256" },
        { "internalType": "address", "name": "", "type": "address" }
      ],
      "name": "noShares",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "oracle",
      "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "string", "name": "_question", "type": "string" },
        { "internalType": "uint256", "name": "_marketEndTime", "type": "uint256" }
      ],
      "name": "proposeMarket",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "_marketId", "type": "uint256" }],
      "name": "requestOracleResolution",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "_marketId", "type": "uint256" },
        { "internalType": "enum InterPredict.Outcome", "name": "_winningOutcome", "type": "uint8" }
      ],
      "name": "resolveMarket",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalDecMembers",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalMarkets",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "_newOracle", "type": "address" }],
      "name": "updateOracle",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "_marketId", "type": "uint256" },
        { "internalType": "bool", "name": "_support", "type": "bool" }
      ],
      "name": "voteOnCuration",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "", "type": "uint256" },
        { "internalType": "address", "name": "", "type": "address" }
      ],
      "name": "yesShares",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  "bytecode": "0x60a034..."
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [historyLogs, setHistoryLogs] = useState<HistoryRecord[]>([])
  const [locale, setLocaleState] = useState<LocaleType>('en')

  // 🟢 CLEANED UP: Default dummy data array elements dropped completely
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

      (window as any).ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

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
      setHistoryLogs(savedLogs ? JSON.parse(savedLogs) : [])

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

    const rpcUrl = "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc";
    const accessToken = process.env.NEXT_PUBLIC_INTERLINK_ACCESS_TOKEN || localStorage.getItem('accessToken') || "";

    const connection = new ethers.FetchRequest(rpcUrl);
    if (accessToken) {
      connection.setHeader("Authorization", `Bearer ${accessToken}`);
    }

    const testnetProvider = new ethers.JsonRpcProvider(connection, undefined, {
      staticNetwork: true
    })

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, testnetProvider)

    return { contract, provider: testnetProvider }
  }

  const createMarketOnChain = async (description: string, marketEndTime: number): Promise<boolean> => {
    const isTeam = walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992";
    const txType = isTeam ? 'Team Deployment' : 'Market Proposal';
    const feeText = isTeam ? '0.00 tITL (Bypassed)' : '1.00 tITL';

    try {
      setTxStatus("Broadcasting market initialization payload...")
      const { provider } = await getContractInstance()

      const iface = new ethers.Interface(CONTRACT_ABI.abi);
      const data = isTeam
        ? iface.encodeFunctionData("createActiveMarket", [description, marketEndTime])
        : iface.encodeFunctionData("proposeMarket", [description, marketEndTime]);

      const txValue = isTeam ? "0x0" : "0x" + ethers.parseEther("1.0").toString(16);

      const txHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data: data,
          value: txValue
        }]
      });

      setTxStatus("Awaiting on-chain verification blocks...")

      let receipt = null;
      while (!receipt) {
        receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (receipt && Number(receipt.status) === 1) {
        setTxStatus("Market structure deployed securely to Interlink registry!")
        if (walletAddress) {
          saveLogToLocalStorage(walletAddress, txType, description, `Success — Fee: ${feeText}`, 'Success')
        }
        return true;
      } else {
        throw new Error("Transaction execution failed on-chain.");
      }
    } catch (err: any) {
      setTxStatus(`Deployment Cancelled: ${err.message}`)
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, txType, description, `Failed — RPC Error or Rejection`, 'Failed')
      }
      return false
    }
  }

  const joinDecOnChain = async (): Promise<boolean> => {
    try {
      setTxStatus("Reading native node balance parameters...")
      const { contract, provider } = await getContractInstance()

      if (walletAddress) {
        const isAlreadyMember = await contract.isDecMember(walletAddress);
        if (isAlreadyMember) {
          setTxStatus("Already a registered DEC Committee Member!");
          return true;
        }
      }

      setTxStatus("Processing DEC Committee registration payment...")
      const iface = new ethers.Interface(CONTRACT_ABI.abi);
      const data = iface.encodeFunctionData("joinCommittee");
      const txValue = "0x" + ethers.parseEther("0.1").toString(16);

      const txHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data: data,
          value: txValue
        }]
      });

      setTxStatus("Node verified! Registering on Interlink network...")

      let receipt = null;
      while (!receipt) {
        receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (receipt && Number(receipt.status) === 1) {
        setTxStatus("Welcome to the Decentralized Curation Committee.")
        if (walletAddress) {
          saveLogToLocalStorage(walletAddress, 'Committee Bond', 'Request to join DEC Committee', 'Success — 0.10 tITL routed to treasury registry contract', 'Success')
          setDecMembers((prev) => [...prev, walletAddress])
        }
        return true;
      } else {
        throw new Error("Transaction reverted on-chain.");
      }
    } catch (err: any) {
      setTxStatus(`Verification Cancelled: ${err.message}`)
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Committee Bond', 'Request to join DEC Committee', 'Failed — Transaction execution terminated', 'Failed')
      }
      return false
    }
  }

  const castVoteOnChain = async (marketId: number, support: boolean) => {
    const ballotText = support ? 'Voted FOR' : 'Voted AGAINST';
    try {
      setTxStatus("Transmitting curation consensus weight...")
      const { provider } = await getContractInstance()

      const iface = new ethers.Interface(CONTRACT_ABI.abi);
      const data = iface.encodeFunctionData("voteOnCuration", [marketId, support]);

      const txHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data: data
        }]
      });

      setTxStatus("Ballot updated successfully on-chain.")

      let receipt = null;
      while (!receipt) {
        receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Governance Vote', `Vote cast on Proposal ID #${marketId}`, `Success — ${ballotText}`, 'Success')
      }
    } catch (err: any) {
      setTxStatus(`Voting Error: ${err.message}`)
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Governance Vote', `Vote cast on Proposal ID #${marketId}`, `Failed — ${err.message.slice(0, 40)}...`, 'Failed')
      }
    }
  }

  const placeBetOnChain = async (marketId: number, outcome: number, amount: string) => {
    const targetSide = outcome === 0 ? 'YES' : 'NO';
    const isYes = outcome === 0;

    try {
      setTxStatus("Transmitting position collateral payload...")
      const { provider } = await getContractInstance()

      const iface = new ethers.Interface(CONTRACT_ABI.abi);
      const data = iface.encodeFunctionData("buyShares", [marketId, isYes]);
      const txValue = "0x" + ethers.parseEther(amount).toString(16);

      const txHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data: data,
          value: txValue
        }]
      });

      setTxStatus("Trade position logged securely inside on-chain pool matrix!")

      let receipt = null;
      while (!receipt) {
        receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Market Trade', `Wager placed on Pool #${marketId}`, `Success — Predicted ${targetSide} with ${amount} tITL`, 'Success')
      }
    } catch (err: any) {
      setTxStatus(`Execution Error: ${err.message}`)
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, 'Market Trade', `Wager placed on Pool #${marketId}`, `Failed — ${targetSide} allocation timed out`, 'Failed')
      }
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