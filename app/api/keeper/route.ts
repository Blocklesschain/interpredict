import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getValidServiceToken } from '@/lib/interlinkServiceAuth'

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  '0x3E5936F13e1194380A66c3c1d75D4D7342299CfF'

const RPC_URL =
  'https://evm-rpc.test-net.interlinklabs.ai/v1/rpc'

const SERVICE_WALLET_PRIVATE_KEY =
  process.env.SERVICE_WALLET_PRIVATE_KEY?.trim()

const CRON_SECRET =
  process.env.CRON_SECRET?.trim()

const iface = new ethers.Interface([
  'function totalMarkets() view returns (uint256)',

  'function markets(uint256) view returns (uint256 id, string question, string description, uint8 category, string customCategory, string thumbnailUri, uint8 origin, address creator, uint256 proposalVotingStart, uint256 proposalVotingDeadline, uint256 approvalVotes, uint256 rejectionVotes, bool proposalFinalized, uint8 proposalDecision, uint256 proposalFinalizationTimestamp, uint256 refundAmount, address refundRecipient, bool refundCompleted, uint256 marketEndTime, uint8 state, uint256 resolutionRequester, uint256 resolutionVotingStart, uint256 resolutionVotingDeadline, uint256 activeDECSnapshot, uint256 resolutionQuorum, uint256 totalResolutionVotes, uint8 decSelectedOutcome, uint8 confirmedOutcome, bool outcomeConfirmed, bool finalized, uint256 finalizationTimestamp, string resolutionCriteria, string primaryEvidenceUri, string backupEvidenceUri, uint256 totalVolume, uint256 participantCount, uint256 creatorFeesEarned, uint256 creatorFeesClaimed, uint256 creatorSeedClaimed, bool cancelled, string cancelReason, uint256 cancelTimestamp)',

  'function enterProposalVoting(uint256)',
  'function finalizeProposalVoting(uint256)',
  'function finalizeResolutionVoting(uint256)',
  'function finalizeMarket(uint256)',
  'function accrueDecRewards(uint256)'
])

interface KeeperResult {
  marketId: number
  action: string
  txHash?: string
  error?: string
}

interface SkippedMarket {
  marketId: number
  error: string
}

async function rpcCall(
  accessToken: string,
  body: unknown,
  callName: string
): Promise<string> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  })

  const responseText = await response.text()

  let json: any

  try {
    json = JSON.parse(responseText)
  } catch {
    throw new Error(
      `${callName} returned invalid JSON: ${responseText.slice(0, 300)}`
    )
  }

  if (!response.ok) {
    throw new Error(
      `${callName} returned HTTP ${response.status}: ${responseText.slice(
        0,
        300
      )}`
    )
  }

  if (json.error) {
    const errorMessage =
      json.error?.data?.message ||
      json.error?.message ||
      JSON.stringify(json.error)

    throw new Error(`${callName} failed: ${errorMessage}`)
  }

  if (
    json.result === undefined ||
    json.result === null ||
    json.result === '0x'
  ) {
    throw new Error(
      `${callName} returned empty data. Check the contract address and ABI.`
    )
  }

  return json.result
}

async function readContractCall(
  accessToken: string,
  data: string,
  callName: string
): Promise<string> {
  return rpcCall(
    accessToken,
    {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'eth_call',
      params: [
        {
          to: CONTRACT_ADDRESS,
          data
        },
        'latest'
      ]
    },
    callName
  )
}

async function executeKeeperAction(
  signer: ethers.Wallet,
  marketId: number,
  functionName:
    | 'enterProposalVoting'
    | 'finalizeProposalVoting'
    | 'finalizeResolutionVoting'
    | 'finalizeMarket'
    | 'accrueDecRewards',
  successAction: string
): Promise<KeeperResult> {
  try {
    const data = iface.encodeFunctionData(
      functionName,
      [marketId]
    )

    /*
     * Estimate first so a reverting transaction is detected before
     * broadcasting it.
     */
    await signer.estimateGas({
      to: CONTRACT_ADDRESS,
      data
    })

    const transaction =
      await signer.sendTransaction({
        to: CONTRACT_ADDRESS,
        data
      })

    const receipt = await transaction.wait()

    if (!receipt) {
      return {
        marketId,
        action: 'failed',
        txHash: transaction.hash,
        error: 'Transaction receipt was not returned'
      }
    }

    if (Number(receipt.status) !== 1) {
      return {
        marketId,
        action: 'failed',
        txHash: transaction.hash,
        error: 'Transaction reverted on-chain'
      }
    }

    return {
      marketId,
      action: successAction,
      txHash: transaction.hash
    }
  } catch (error: unknown) {
    return {
      marketId,
      action: 'error',
      error:
        error instanceof Error
          ? error.message
          : `${functionName} failed`
    }
  }
}

export async function GET(request: Request) {
  /*
   * Never leave this endpoint publicly callable. The keeper signs
   * transactions with the service wallet.
   */
  if (!CRON_SECRET) {
    console.error(
      'CRON_SECRET is not configured. Keeper execution blocked.'
    )

    return NextResponse.json(
      {
        error: 'CRON_SECRET not configured'
      },
      {
        status: 500
      }
    )
  }

  const authorization =
    request.headers.get('authorization')

  if (authorization !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      {
        error: 'Unauthorized'
      },
      {
        status: 401
      }
    )
  }

  if (
    !SERVICE_WALLET_PRIVATE_KEY
  ) {
    return NextResponse.json(
      {
        error:
          'SERVICE_WALLET_PRIVATE_KEY not configured'
      },
      {
        status: 500
      }
    )
  }

  if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    return NextResponse.json(
      {
        error:
          'NEXT_PUBLIC_CONTRACT_ADDRESS is missing or invalid'
      },
      {
        status: 500
      }
    )
  }

  let validatedServiceWallet: ethers.Wallet

  try {
    validatedServiceWallet =
      new ethers.Wallet(
        SERVICE_WALLET_PRIVATE_KEY
      )
  } catch {
    return NextResponse.json(
      {
        error:
          'SERVICE_WALLET_PRIVATE_KEY is invalid'
      },
      {
        status: 500
      }
    )
  }

  const results: KeeperResult[] = []
  const skippedMarkets: SkippedMarket[] = []

  try {
    const accessToken =
      await getValidServiceToken()

    const countResult =
      await readContractCall(
        accessToken,
        iface.encodeFunctionData(
          'totalMarkets'
        ),
        'totalMarkets()'
      )

    const totalCount = Number(
      iface.decodeFunctionResult(
        'totalMarkets',
        countResult
      )[0]
    )

    if (
      !Number.isSafeInteger(totalCount) ||
      totalCount < 0
    ) {
      throw new Error(
        `Invalid totalMarkets value: ${totalCount}`
      )
    }

    const nowSec =
      Math.floor(Date.now() / 1000)

    const toEnterVoting: number[] = []
    const toFinalizeProposal: number[] = []
    const toFinalizeResolution: number[] = []
    const toFinalizeMarket: number[] = []
    const toAccrueRewards: number[] = []

    console.log('Keeper market scan started', {
      contractAddress: CONTRACT_ADDRESS,
      serviceWallet:
        validatedServiceWallet.address,
      totalCount,
      nowSec
    })

    /*
     * Your market IDs start from zero.
     */
    for (
      let marketId = 0;
      marketId < totalCount;
      marketId++
    ) {
      try {
        const rawMarket =
          await readContractCall(
            accessToken,
            iface.encodeFunctionData(
              'markets',
              [marketId]
            ),
            `markets(${marketId})`
          )

        const decoded =
          iface.decodeFunctionResult(
            'markets',
            rawMarket
          )

        const proposalVotingStart =
          Number(decoded[8])

        const proposalVotingDeadline =
          Number(decoded[9])

        const state =
          Number(decoded[19])

        const resolutionVotingDeadline =
          Number(decoded[22])

        const outcomeConfirmed =
          Boolean(decoded[28])

        const finalized =
          Boolean(decoded[29])

        /*
         * State 3: Proposed.
         *
         * Enter voting when its configured voting start has arrived.
         * A start value of zero is treated as immediately eligible.
         */
        if (
          state === 3 &&
          (
            proposalVotingStart === 0 ||
            nowSec >= proposalVotingStart
          )
        ) {
          toEnterVoting.push(marketId)
        }

        /*
         * State 4: DEC proposal voting.
         */
        else if (
          state === 4 &&
          proposalVotingDeadline > 0 &&
          nowSec >= proposalVotingDeadline
        ) {
          toFinalizeProposal.push(marketId)
        }

        /*
         * State 9: DEC resolution voting.
         */
        else if (
          state === 9 &&
          resolutionVotingDeadline > 0 &&
          nowSec >= resolutionVotingDeadline
        ) {
          toFinalizeResolution.push(marketId)
        }

        /*
         * State 11: Outcome confirmed.
         */
        else if (
          state === 11 &&
          outcomeConfirmed &&
          !finalized
        ) {
          toFinalizeMarket.push(marketId)
        }

        /*
         * State 12: Finalized.
         *
         * This assumes accrueDecRewards() is protected against
         * duplicate accrual inside the contract.
         */
        else if (
          state === 12 &&
          finalized
        ) {
          toAccrueRewards.push(marketId)
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown market scan error'

        console.error(
          `Keeper could not read market ${marketId}:`,
          message
        )

        skippedMarkets.push({
          marketId,
          error: message
        })
      }
    }

    const queuedActions =
      toEnterVoting.length +
      toFinalizeProposal.length +
      toFinalizeResolution.length +
      toFinalizeMarket.length +
      toAccrueRewards.length

    if (queuedActions === 0) {
      return NextResponse.json({
        processed: 0,
        successful: 0,
        failed: 0,
        results: [],
        message:
          'No markets are currently due for transition.',
        diagnostics: {
          contractAddress:
            CONTRACT_ADDRESS,
          serviceWallet:
            validatedServiceWallet.address,
          totalMarketsReported:
            totalCount,
          marketsScanned:
            totalCount -
            skippedMarkets.length,
          marketsSkipped:
            skippedMarkets.length,
          skippedMarkets
        }
      })
    }

    const connection =
      new ethers.FetchRequest(RPC_URL)

    connection.setHeader(
      'Authorization',
      `Bearer ${accessToken}`
    )

    const provider =
      new ethers.JsonRpcProvider(
        connection
      )

    const serviceSigner =
      validatedServiceWallet.connect(provider)

    for (
      const marketId of toEnterVoting
    ) {
      results.push(
        await executeKeeperAction(
          serviceSigner,
          marketId,
          'enterProposalVoting',
          'entered_voting'
        )
      )
    }

    for (
      const marketId of
      toFinalizeProposal
    ) {
      results.push(
        await executeKeeperAction(
          serviceSigner,
          marketId,
          'finalizeProposalVoting',
          'proposal_finalized'
        )
      )
    }

    for (
      const marketId of
      toFinalizeResolution
    ) {
      results.push(
        await executeKeeperAction(
          serviceSigner,
          marketId,
          'finalizeResolutionVoting',
          'resolution_finalized'
        )
      )
    }

    for (
      const marketId of
      toFinalizeMarket
    ) {
      results.push(
        await executeKeeperAction(
          serviceSigner,
          marketId,
          'finalizeMarket',
          'market_finalized'
        )
      )
    }

    for (
      const marketId of
      toAccrueRewards
    ) {
      results.push(
        await executeKeeperAction(
          serviceSigner,
          marketId,
          'accrueDecRewards',
          'rewards_accrued'
        )
      )
    }

    const successful =
      results.filter(
        result =>
          result.action !== 'error' &&
          result.action !== 'failed'
      ).length

    const failed =
      results.length - successful

    return NextResponse.json({
      processed: results.length,
      successful,
      failed,
      results,
      queues: {
        enterVoting:
          toEnterVoting.length,
        finalizeProposal:
          toFinalizeProposal.length,
        finalizeResolution:
          toFinalizeResolution.length,
        finalizeMarket:
          toFinalizeMarket.length,
        accrueRewards:
          toAccrueRewards.length
      },
      diagnostics: {
        contractAddress:
          CONTRACT_ADDRESS,
        serviceWallet:
          serviceSigner.address,
        totalMarketsReported:
          totalCount,
        marketsScanned:
          totalCount -
          skippedMarkets.length,
        marketsSkipped:
          skippedMarkets.length,
        skippedMarkets
      }
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Keeper run failed'

    console.error(
      'GET /api/keeper failed:',
      error
    )

    return NextResponse.json(
      {
        error: message,
        diagnostics: {
          contractAddress:
            CONTRACT_ADDRESS,
          serviceWallet:
            validatedServiceWallet.address,
          marketsSkipped:
            skippedMarkets.length,
          skippedMarkets
        }
      },
      {
        status: 502
      }
    )
  }
}