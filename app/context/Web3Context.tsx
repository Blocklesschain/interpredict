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
const CONTRACT_ADDRESS = process.env.PUBLIC_CONTRACT_ADDRESS! || "0x9530477f41bA8e6272251376389d09Dd490CF38e";

const CONTRACT_ABI = {
  "_format": "hh3-artifact-1",
  "contractName": "InterPredict",
  "sourceName": "contracts/InterPredict.sol",
  "abi": [
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
          "name": "marketEndTime",
          "type": "uint256"
        }
      ],
      "name": "OracleResolutionRequested",
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
      "name": "DEC_POOL_FEE_BPS",
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
      "name": "TEAM_BASE_FEE_BPS",
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
      "name": "TEAM_EXCLUSIVE_FEE_BPS",
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
      "name": "TOTAL_PLATFORM_FEE_BPS",
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
          "internalType": "enum InterPredict.MarketState",
          "name": "state",
          "type": "uint8"
        },
        {
          "internalType": "enum InterPredict.Outcome",
          "name": "winningOutcome",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "creatorFeeClaimed",
          "type": "bool"
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
        },
        {
          "internalType": "bool",
          "name": "oracleResolutionRequested",
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
        }
      ],
      "name": "requestOracleResolution",
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
  ],
  "bytecode": "0x60a0346100e057601f611ff338819003918201601f19168301916001600160401b038311848410176100e4578084926020946040528339810103126100e057516001600160a01b038116908190036100e057801561009b57336080525f80546001600160a01b031916919091179055604051611efa90816100f98239608051818181610cf001528181610e1601528181611712015261197a0152f35b60405162461bcd60e51b815260206004820152601d60248201527f4f7261636c652063616e6e6f74206265207a65726f20616464726573730000006044820152606490fd5b5f80fd5b634e487b7160e01b5f52604160045260245ffdfe60406080815260049081361015610014575f80fd5b5f91823560e01c9081631415501314611a545781631853a9a314611a315781631cb44dfc1461194d5781634a021131146116fc5781634ddc948414610cd65781634e1f3a00146114e6578163578efbe9146114a457816367792453146114875781636ff809471461146857816374a12de9146114215781637dc0d1d0146113f957816380ae8e1c146112575781638162486b146112385781638a69614e14610d1f5781638da5cb5b14610cdb578163922621e614610cd6578163a438d20814610cb8578163a5025a1f14610c9b578163b1283e7714610ad5578163c7b4e49a1461094f578163caec3f781461090d578163cc3cbd2a146108f1578163d017eb51146108b9578163d20c99801461087b578163d9f04fef1461073d578163df55406e146105a5578163eb7177ee14610453578163f53f2ee914610180575063fc24a6d31461015f575f80fd5b3461017c578160031936011261017c576020906003549051908152f35b5080fd5b838361018b36611c7f565b929091670de0b6b3a76400003403610406576201518042018042116103f357808511156103a45760018054956101c087611dd5565b8255868852602098808a52858920928884558084019167ffffffffffffffff891161039157506101f08254611d07565b601f811161034b575b5089601f89116001146102bb57600660609897958c9d958b989495897f86f2cce22e1fd87012e7563adb52b03dc2cb2204b2814eccb8859fa2aa5ca2cc9e9f8198610284978392936102b0575b501b905f198960031b1c19161790555b60028201556003810193845501805461ff01600160b01b0319163360101b62010000600160b01b0316179055565b54928551978689978852870152868601378383018501899052830152601f01601f19168101030190a280f35b8c013592505f610246565b828b528b8b2090601f198a168c5b8181106103365750957f86f2cce22e1fd87012e7563adb52b03dc2cb2204b2814eccb8859fa2aa5ca2cc9b9c9d958b9894958996610284956006958960609f9e9c1061031d575b505087811b019055610256565b8b01355f1960038b901b60f8161c191690555f80610310565b89830135845592840192918e01918e016102c9565b828b528b8b20601f8a0160051c8101918d8b10610387575b601f0160051c019082905b82811061037c5750506101f9565b8c815501829061036e565b9091508190610363565b634e487b7160e01b8b526041905260248afd5b825162461bcd60e51b81526020818901526024808201527f4d61726b657420656e642074696d65206d75737420626520616674657220766f60448201526374696e6760e01b6064820152608490fd5b634e487b7160e01b865260118752602486fd5b815162461bcd60e51b8152602081880152602160248201527f4d757374206c6f636b20737472696374207374616b6520706172616d657465726044820152607360f81b6064820152608490fd5b905061045e36611ce8565b929091828552602090808252828620610489600160ff60068401541661048381611d75565b14611e81565b600281015442101561057257341561053c577f699d9d9aea70aa76e771cfeef6990faa0bdd3b5b5ba9dd208a66188b2f2c7cd4939291908615610506578588526005835283882033895283528388206104e3348254611df7565b9055016104f1348254611df7565b90555b8151941515855234908501523393a380f35b60059150858852600683528388203389528352838820610527348254611df7565b905501610535348254611df7565b90556104f4565b50915162461bcd60e51b815291820152601160248201527005761676572206d757374206265203e203607c1b6044820152606490fd5b50915162461bcd60e51b815291820152600e60248201526d151c98591a5b99c818db1bdcd95960921b6044820152606490fd5b9050346107395781600319360112610739578035916024359160038310156107355784546001600160a01b031633036106f357838552806020528185206006810191825491600160ff84166105f981611d75565b036106b05760020154421061065e5750918391600260209461063b7f739f283563fb51ab6b89ee95d937b2e63a6cfcb83c385dbebb629f9d97bd43e697611d75565b61ffff1916600885901b61ff001617179055519061065881611d75565b8152a280f35b608490602085519162461bcd60e51b8352820152602660248201527f4d61726b657420686173206e6f74207265616368656420736574746c656d656e604482015265742074696d6560d01b6064820152fd5b845162461bcd60e51b8152602081840152601a60248201527f4d61726b6574206e6f7420696e204163746976652073746174650000000000006044820152606490fd5b6020606492519162461bcd60e51b8352820152601760248201527f4f6e6c79206f7261636c652063616e207265736f6c76650000000000000000006044820152fd5b8480fd5b8280fd5b919050826003193601126107395767016345785d8a0000340361083857338352600760205260ff8184205416610802573383526007602052808320600160ff1982541617905561078e600354611dd5565b6003558280808034736e832252ea4c78068ee109d953724d27624319925af16107b5611e42565b50156107bf578280f35b906020606492519162461bcd60e51b8352820152601860248201527f5472656173757279207472616e73666572206661696c656400000000000000006044820152fd5b906020606492519162461bcd60e51b8352820152601060248201526f20b63932b0b23c90309036b2b6b132b960811b6044820152fd5b906020606492519162461bcd60e51b8352820152601a60248201527f496e636f727265637420726567697374726174696f6e206661696c65640000000000006044820152fd5b50503461017c57602036600319011261017c5760209160ff9082906001600160a01b036108a6611c4f565b1681526007855220541690519015158152f35b50503461017c57602036600319011261017c5760209181906001600160a01b036108e1611c4f565b1681526009845220549051908152f35b50503461017c578160031936011261017c576020905160648152f35b905034610739578160031936011261073957602092829161092c611c69565b90358252600685528282206001600160a01b039091168252845220549051908152f35b919050346107395782600319360112610739573383526020906007825260ff818520541615610a94576003548015610a525761098d90600254611e17565b338552600983526109a18286205482611e35565b908115610a0f578580809381933383526009885286832055335af16109c4611e42565b50156109ce578380f35b5162461bcd60e51b815291820152601760248201527f52657761726473207472616e73666572206661696c6564000000000000000000604482015260649150fd5b50505162461bcd60e51b815291820152601e60248201527f4e6f20636c61696d61626c65207265776172647320617661696c61626c650000604482015260649150fd5b505162461bcd60e51b815291820152601c60248201527f4e6f20616374697665206d656d62657273207265676973746572656400000000604482015260649150fd5b5162461bcd60e51b815291820181905260248201527f4f6e6c7920636f6d6d6974746565206d656d626572732063616e20636c61696d604482015260649150fd5b8391503461017c5760209182600319360112610c98578135815281835283812090815494600193848401825180968590835493610b1185611d07565b948585528b83821691825f14610c76575050600114610c3a575b505088999798969493925090610b42910388611d3f565b60028301549060038401549084015460058501549160068601549360078701549560ff600960088a0154990154169881519d8e9d8e9d8e528d6101a09d8e91015280519e8f9d8e910152825b8d8110610c1d575050506101c09c8c018d01528a01526060890152608088015260a087015260ff90808216610bc281611d75565b60c0880152818160081c16610bd681611d75565b60e0880152601081901c6001600160a01b031661010088015260b01c1615156101208601526101408501526101608401521515610180830152601f01601f19168101030190f35b8181018301519e81016101c0019e909e528f9d8f9d508201610b8e565b8a925087528187209087915b858310610c5e575050610b4293508201018a80610b2b565b8054838c018501528a94508b93909201918101610c46565b9250935050610b4294915060ff191682840152151560051b8201018a80610b2b565b80fd5b50503461017c578160031936011261017c576020905161012c8152f35b50503461017c578160031936011261017c5760209051620151808152f35b611ccd565b50503461017c578160031936011261017c57517f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602090f35b91905034610739576020908160031936011261123457823580855283835281852060068101908154600260ff8216610d5681611d75565b036111f1578682019160ff610d7360058554930192835490611df7565b9260081c16610d8181611d75565b806110a457505083885260058652848820338952865284882054801561106157610dcb9291610dc391868b5260058952878b20338c5289528a88812055611e04565b905490611e17565b6101f4808202928215918385041482171561104e576127108094049460c8840284810460c81484171561103b57825490869004968b966001600160a01b0395919290919060101c86167f00000000000000000000000000000000000000000000000000000000000000008716036110155761012c9081880291888304141715611002570494610e6691610e5d91611e35565b96600254611df7565b6002558651908682527fe97cee5a4c0549d3fdc81e322b718ddf0aeb3418ec87dce4f9a7fb28d117c312893393a388808080736e832252ea4c78068ee109d953724d276243199296875af1610eb9611e42565b5015610fc157908392918994151580610fb2575b610f30575b5050505080808093335af1610ee5611e42565b5015610eef578380f35b5162461bcd60e51b815291820181905260248201527f5061796f7574207472616e7366657220657865637574696f6e206661696c6564604482015260649150fd5b848085819482945460101c165af1610f46611e42565b5015610f54575b8080610ed2565b82809281925af1610f63611e42565b5015610f7157845f80610f4d565b606484848085519262461bcd60e51b845283015260248201527f46616c6c6261636b20747265617375727920726f7574696e67206661696c65646044820152fd5b5081815460101c161515610ecd565b606488888089519262461bcd60e51b845283015260248201527f5465616d20706c6174666f726d2066656520726f7574696e67206661696c65646044820152fd5b634e487b7160e01b8d5260118c5260248dfd5b5050939450610e66610e5d8795611035896110308184611e35565b611e35565b97611e35565b634e487b7160e01b8b5260118c5260248dfd5b634e487b7160e01b895260118852602489fd5b855162461bcd60e51b8152808901889052601b60248201527f4e6f2077696e6e696e67205945532073686172657320666f756e6400000000006044820152606490fd5b60019193506110b281611d75565b0361113a578388526006865284882033895286528488205480156110f7576110f29291610dc391868b5260068952878b20338c5289528a88812055611e04565b610dcb565b855162461bcd60e51b8152808901889052601a60248201527f4e6f2077696e6e696e67204e4f2073686172657320666f756e640000000000006044820152606490fd5b505081865260058452828620338752845261116b838720548388526006865284882033895286528488205490611df7565b801561119e5782875260058552838720338852855286848120558287526006855283872033885285528684812055610dcb565b835162461bcd60e51b8152808701869052602760248201527f4e6f20617373657473207469656420746f20706f6f6c20717565727920616c6c60448201526637b1b0ba34b7b760c91b6064820152608490fd5b845162461bcd60e51b8152808801879052601760248201527f4d61726b6574206e6f74207265736f6c766564207965740000000000000000006044820152606490fd5b8380fd5b50503461017c578160031936011261017c576020906001549051908152f35b919050346107395761126836611ce8565b91903385526020906007825260ff8387205416156113b6578086528482528286209460ff60068701541661129b81611d75565b6113735760038601544210156113385781875260088352838720338852835260ff8488205416611305575085526008815281852033865290528320805460ff19166001179055156112f8576007016112f38154611dd5565b905580f35b6008016112f38154611dd5565b835162461bcd60e51b8152908101839052600d60248201526c105b1c9958591e481d9bdd1959609a1b6044820152606490fd5b835162461bcd60e51b8152908101839052601560248201527410dd5c985d1a5bdb881c195c9a5bd908195b991959605a1b6044820152606490fd5b835162461bcd60e51b8152908101839052601b60248201527f4d61726b6574206e6f742070656e64696e67206375726174696f6e00000000006044820152606490fd5b825162461bcd60e51b8152808601839052601d60248201527f4f6e6c792044454320636f6d6d69747465652063616e206375726174650000006044820152606490fd5b50503461017c578160031936011261017c57905490516001600160a01b039091168152602090f35b9050346107395781600319360112610739578160209360ff92611442611c69565b90358252600886528282206001600160a01b039091168252855220549151911615158152f35b50503461017c578160031936011261017c576020906002549051908152f35b50503461017c578160031936011261017c57602090516101f48152f35b90503461073957816003193601126107395760209282916114c3611c69565b90358252600585528282206001600160a01b039091168252845220549051908152f35b91905034610739576020908160031936011261123457823592838552808352818520906006820190815460ff811661151d81611d75565b6116b957600384015442106116765760078401546008850154811015908161166c575b5015611583575050805460ff191660011790556002015490519081527f3ffddaebf2131ba012fa389229b73814e7ab6eea5db6e24b19ef484c55b2490f9190a280f35b61ffff1916610202178255945090508480808067016345785d8a0000736e832252ea4c78068ee109d953724d27624319925af16115be611e42565b501561162a57548490819081908190670c7d713b49da00009060101c6001600160a01b03165af16115ed611e42565b50156115f95750505080f35b5162461bcd60e51b815291820152600d60248201526c1499599d5b990819985a5b1959609a1b604482015260649150fd5b505162461bcd60e51b815291820152601b60248201527f5465616d2070656e616c747920726f7574696e67206661696c65640000000000604482015260649150fd5b905015155f611540565b845162461bcd60e51b8152808301879052601c60248201527f4375726174696f6e20766f74696e67207374696c6c20616374697665000000006044820152606490fd5b845162461bcd60e51b8152808301879052601a60248201527f4d61726b657420616c726561647920696e697469616c697a65640000000000006044820152606490fd5b91905061170836611c7f565b90929091611740337f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031614611d93565b4283111561190a5760019081549561175787611dd5565b8355868852602095818752848920928884558484019267ffffffffffffffff831161039157506117878354611d07565b601f81116118c4575b5089908a601f841160011461183957928061182696937f3ffddaebf2131ba012fa389229b73814e7ab6eea5db6e24b19ef484c55b2490f9b9a999896936006969261182e575b50505f19600383901b1c191690851b1790555b6002810186905501805462010000600160b01b031990921661ff01600160b01b0319909216919091173360101b62010000600160b01b0316179055565b51908152a280f35b013590505f806117d6565b50838b52888b2091601f1984168c5b8181106118af57509361182696938896937f3ffddaebf2131ba012fa389229b73814e7ab6eea5db6e24b19ef484c55b2490f9c9b9a99938360069810611896575b505050811b0190556117e9565b01355f19600384901b60f8161c191690555f8080611889565b83830135855593880193918b01918b01611848565b838b52888b20601f840160051c8101918a8510611900575b601f0160051c019086905b8281106118f5575050611790565b8c81550186906118e7565b90915081906118dc565b815162461bcd60e51b8152602081870152601a60248201527f456e642074696d65206d75737420626520696e206675747572650000000000006044820152606490fd5b90503461073957602036600319011261073957611968611c4f565b6001600160a01b03919082906119a1337f0000000000000000000000000000000000000000000000000000000000000000841614611d93565b169283156119e457505082546001600160a01b0319811683178455167f078c3b417dadf69374a59793b829c52001247130433427049317bde56607b1b78380a380f35b906020608492519162461bcd60e51b8352820152602160248201527f4e6577206f7261636c652063616e6e6f74206265207a65726f206164647265736044820152607360f81b6064820152fd5b50503461017c578160031936011261017c5760209051670de0b6b3a76400008152f35b83833461017c5760209081600319360112610739578335918284528481528184209060ff60068301541692611a8884611d75565b611a956001809514611e81565b600283015492834210611c0c576009810180549860ff8a16611bbb57509085918260ff19809b1617905501938151948286528798815490611ad582611d07565b809589015283821691825f14611b76575050600114611b1f575b5050508201527f4d4f7c8547076a9b6633db948de95deb991e9cef7e1813439f684878cdedd3429080850390a280f35b875282872092975086925b828410611b6257505050820160600194817f4d4f7c8547076a9b6633db948de95deb991e9cef7e1813439f684878cdedd34284611aef565b805486850160600152928801928101611b2a565b1660608881019190915293151560051b870190930198508492507f4d4f7c8547076a9b6633db948de95deb991e9cef7e1813439f684878cdedd3429150859050611aef565b835162461bcd60e51b8152908101859052602560248201527f4f7261636c65207265736f6c76656420616c726561647920696e697469616044820152641b1a5e995960da1b6064820152608490fd5b815162461bcd60e51b8152808901849052601e60248201527f54726164696e672077696e646f77206973207374696c6c2061637469766500006044820152606490fd5b600435906001600160a01b0382168203611c6557565b5f80fd5b602435906001600160a01b0382168203611c6557565b906040600319830112611c655760043567ffffffffffffffff92838211611c655780602383011215611c65578160040135938411611c655760248483010111611c6557602401919060243590565b34611c65575f366003190112611c6557602060405160c88152f35b6040906003190112611c6557600435906024358015158103611c655790565b90600182811c92168015611d35575b6020831014611d2157565b634e487b7160e01b5f52602260045260245ffd5b91607f1691611d16565b90601f8019910116810190811067ffffffffffffffff821117611d6157604052565b634e487b7160e01b5f52604160045260245ffd5b60031115611d7f57565b634e487b7160e01b5f52602160045260245ffd5b15611d9a57565b60405162461bcd60e51b815260206004820152601360248201527213db9b1e481bdddb995c8818d85b8818d85b1b606a1b6044820152606490fd5b5f198114611de35760010190565b634e487b7160e01b5f52601160045260245ffd5b91908201809211611de357565b81810292918115918404141715611de357565b8115611e21570490565b634e487b7160e01b5f52601260045260245ffd5b91908203918211611de357565b3d15611e7c573d9067ffffffffffffffff8211611d615760405191611e71601f8201601f191660200184611d3f565b82523d5f602084013e565b606090565b15611e8857565b60405162461bcd60e51b81526020600482015260146024820152734d61726b6574206973206e6f742061637469766560601b6044820152606490fdfea264697066735822122042f18a295816ac0ae081ec46f9430f9a3822782326f31e33501dc2df5f91631264736f6c63430008140033",
  "linkReferences": {},
  "deployedLinkReferences": {},
  "immutableReferences": {
    "107": [
      {
        "length": 32,
        "start": 3312
      },
      {
        "length": 32,
        "start": 3606
      },
      {
        "length": 32,
        "start": 5906
      },
      {
        "length": 32,
        "start": 6522
      }
    ]
  },
  "inputSourceName": "project/contracts/InterPredict.sol",
  "buildInfoId": "solc-0_8_20-a504b33a29c67bc9b45faa17948249fb2f91eab9"
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [historyLogs, setHistoryLogs] = useState<HistoryRecord[]>([])
  const [locale, setLocaleState] = useState<LocaleType>('en')
  const [decMembers, setDecMembers] = useState<string[]>([
    "0x9A54b9d038eF3c0076c54BD9d60705Da25A12bc4",
    "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  ])

  // Hydrate language preference from localStorage safely
  useEffect(() => {
    const savedLocale = localStorage.getItem('interpredict_lang') as LocaleType
    if (savedLocale) setLocaleState(savedLocale)
  }, [])

  const setLocale = (lang: LocaleType) => {
    setLocaleState(lang)
    localStorage.setItem('interpredict_lang', lang)
  }

  // Simple translation look-up helper
  const t = (key: keyof typeof translations['en']) => {
    return translations[locale][key] || translations['en'][key]
  }

  // 💾 Persistent local log-saving system
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

    // Sync React state logs to prevent display mismatch
    setHistoryLogs(updatedLogs)
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
            const activeAddress = accounts[0].address
            setWalletAddress(activeAddress)

            // Populate persistent logs for this re-connected address instantly
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

    const savedLocale = localStorage.getItem('interpredict_lang') as LocaleType
    if (savedLocale) {
      setLocaleState(savedLocale)
    } else {
      setLocaleState('en')
      localStorage.setItem('interpredict_lang', 'en')
    }
    checkExistingConnection()
  }, [])

  // Handle automatic account switching natively via MetaMask events
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          const activeAddress = accounts[0]
          setWalletAddress(activeAddress)
          localStorage.setItem('interpredict_connected', 'true')

          // Reload the specific logs for this new wallet address
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
        params: [{ chainId: `0x${Number(INTERLINK_TESTNET_CHAIN_ID).toString(16)}` }], // Converted to hex
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

      // Populate logs for the connected wallet
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
    setHistoryLogs([]) // Clear history on disconnect for privacy
    localStorage.removeItem('interpredict_connected')
    setTxStatus("Wallet session cleared successfully.")
  }

  const getContractInstance = async () => {
    if (!(window as any).ethereum) throw new Error("Wallet not identified")

    const walletProvider = new ethers.BrowserProvider((window as any).ethereum)
    const signer = await walletProvider.getSigner()
    const testnetProvider = new ethers.JsonRpcProvider("https://evm-rpc.test-net.interlinklabs.ai/v1/rpc")
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, signer)

    return { contract, provider: testnetProvider }
  }

  /**
   * 1️⃣ ENGINE: Create Active Market (Team) or Propose Market (Community)
   * Automatically parses custom selected timestamps and leverages dynamic EIP-1559 gas rates.
   */
  const createMarketOnChain = async (description: string, marketEndTime: number): Promise<boolean> => {
    const isTeam = walletAddress?.toLowerCase() === "0x6e832252ea4c78068ee109d953724d2762431992";
    const txType = isTeam ? 'Team Deployment' : 'Market Proposal';
    const feeText = isTeam ? '0.00 tITL (Bypassed)' : '1.00 tITL';

    try {
      setTxStatus("Broadcasting market initialization payload...")
      const { contract, provider } = await getContractInstance()

      // Dynamic EIP-1559 Fee Data Fetching 
      const feeData = await provider.getFeeData();

      let tx;
      if (isTeam) {
        tx = await contract.createActiveMarket(description, marketEndTime, {
          gasLimit: 250000,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        })
      } else {
        tx = await contract.proposeMarket(description, marketEndTime, {
          value: ethers.parseEther("1.0"),
          gasLimit: 250000,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        })
      }

      setTxStatus("Awaiting on-chain verification blocks...")
      await tx.wait()
      setTxStatus("Market structure deployed securely to Interlink registry!")

      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, txType, description, `Success — Fee: ${feeText}`, 'Success')
      }
      return true
    } catch (err: any) {
      setTxStatus(`Deployment Cancelled: ${err.message}`)
      if (walletAddress) {
        saveLogToLocalStorage(walletAddress, txType, description, `Failed — RPC Error or Rejection`, 'Failed')
      }
      return false
    }
  }

  /**
   * 2️⃣ ENGINE: Join the Decentralized Curation Committee (DEC)
   * Integrates a pre-execution registry state-check to bypass errors.
   */
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
      const feeData = await provider.getFeeData();

      const tx = await contract.joinCommittee({
        value: ethers.parseEther("0.1"),
        gasLimit: 250000,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      })
      await tx.wait()

      setTxStatus("Node verified! Welcome to the Decentralized Curation Committee.")

      if (walletAddress) {
        saveLogToLocalStorage(
          walletAddress,
          'Committee Bond',
          'Request to join DEC Committee',
          'Success — 0.10 tITL routed to treasury registry contract',
          'Success'
        )
        setDecMembers((prev) => [...prev, walletAddress])
      }

      return true
    } catch (err: any) {
      setTxStatus(`Verification Cancelled: ${err.message}`)
      if (walletAddress) {
        saveLogToLocalStorage(
          walletAddress,
          'Committee Bond',
          'Request to join DEC Committee',
          'Failed — Transaction execution terminated',
          'Failed'
        )
      }
      return false
    }
  }

  /**
   * 3️⃣ ENGINE: Cast Vote on Proposal Curation
   * Adapted to EIP-1559 models.
   */
  const castVoteOnChain = async (marketId: number, support: boolean) => {
    const ballotText = support ? 'Voted FOR' : 'Voted AGAINST';
    try {
      setTxStatus("Transmitting curation consensus weight...")
      const { contract, provider } = await getContractInstance()
      const feeData = await provider.getFeeData()

      const tx = await contract.voteOnCuration(marketId, support, {
        gasLimit: 250000,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      })
      await tx.wait()
      setTxStatus("Ballot updated successfully on-chain.")

      if (walletAddress) {
        saveLogToLocalStorage(
          walletAddress,
          'Governance Vote',
          `Vote cast on Proposal ID #${marketId}`,
          `Success — ${ballotText}`,
          'Success'
        )
      }
    } catch (err: any) {
      setTxStatus(`Voting Error: ${err.message}`)
      if (walletAddress) {
        saveLogToLocalStorage(
          walletAddress,
          'Governance Vote',
          `Vote cast on Proposal ID #${marketId}`,
          `Failed — ${err.message.slice(0, 40)}...`,
          'Failed'
        )
      }
    }
  }

  /**
   * 4️⃣ ENGINE: Purchase YES/NO Shares inside Prediction Pools
   * Uses dynamic EIP-1559 network configurations.
   */
  const placeBetOnChain = async (marketId: number, outcome: number, amount: string) => {
    const targetSide = outcome === 0 ? 'YES' : 'NO';
    const isYes = outcome === 0;

    try {
      setTxStatus("Transmitting position collateral payload...")
      const { contract, provider } = await getContractInstance()
      const feeData = await provider.getFeeData()

      const tx = await contract.buyShares(marketId, isYes, {
        value: ethers.parseEther(amount),
        gasLimit: 250000,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      })
      await tx.wait()
      setTxStatus("Trade position logged securely inside on-chain pool matrix!")

      if (walletAddress) {
        saveLogToLocalStorage(
          walletAddress,
          'Market Trade',
          `Wager placed on Pool #${marketId}`,
          `Success — Predicted ${targetSide} with ${amount} tITL`,
          'Success'
        )
      }
    } catch (err: any) {
      setTxStatus(`Execution Error: ${err.message}`)
      if (walletAddress) {
        saveLogToLocalStorage(
          walletAddress,
          'Market Trade',
          `Wager placed on Pool #${marketId}`,
          `Failed — ${targetSide} allocation timed out`,
          'Failed'
        )
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