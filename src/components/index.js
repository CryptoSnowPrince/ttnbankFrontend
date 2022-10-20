import { useCallback, useEffect, useState } from "react";
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import web3ModalSetup from "./../helpers/web3ModalSetup";
import Web3 from "web3";
import getAbi, {
  MIN_DEPOSIT_AMOUNT,
  MAX_DEPOSIT_AMOUNT,
  REFERRAL_PERCENT,
  DEPOSIT_FEE,
  // WITHDRAW_FEE,
  DENOMINATOR,
  DENOMINATOR_PERCENT,
  STAKE_DECIMALS,
  REWARD_DECIMALS,
  EPOCH_LENGTH,
  contractAddress,
  START_TIME,
  RPC_URL,
  MAINNET,
  ADMIN_ACCOUNT,
  REF_PREFIX
} from "../Abi";
import getTokenAbi from "../tokenAbi";
// import logo from "./../assets/logo.png";
// import logoMobile from "./../assets/logo.png";
// import axios from "axios";
// import adBanner from "./../assets/banner.gif";

const web3Modal = web3ModalSetup();
// console.log("web3Modal: ", web3Modal);

const LightTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.black,
    color: 'rgba(255, 255, 255, 0.8)',
    boxShadow: theme.shadows[1],
    fontSize: 18,
  },
}));

const httpProvider = new Web3.providers.HttpProvider(RPC_URL)
const web3NoAccount = new Web3(httpProvider)
const isAddress = web3NoAccount.utils.isAddress
// const tokenAbiNoAccount = getTokenAbi(web3NoAccount)
const AbiNoAccount = getAbi(web3NoAccount)

const Interface = () => {
  const isMobile = window.matchMedia("only screen and (max-width: 1000px)").matches;

  const [Abi, setAbi] = useState();
  const [tokenAbi, setTokenAbi] = useState();
  const [web3, setWeb3] = useState();
  const [isConnected, setIsConnected] = useState(false);
  const [injectedProvider, setInjectedProvider] = useState();
  const [refetch, setRefetch] = useState(true);
  // const [errorMessage, setErrorMessage] = useState(null);
  // const [accounts, setAccounts] = useState(null);
  const [curAcount, setCurAcount] = useState(null);
  const [connButtonText, setConnButtonText] = useState("CONNECT");
  const [refLink, setRefLink] = useState(`${REF_PREFIX}0x0000000000000000000000000000000000000000`);
  const [totalAmount, setTotalAmount] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [userApprovedAmount, setUserApprovedAmount] = useState(0);
  const [userDepositedAmount, setUserDepositedAmount] = useState(0);
  // const [userDailyRoi, setUserDailyRoi] = useState(0);
  // const [dailyReward, setDailyReward] = useState(0);
  // const [startTime, setClaimStartTime] = useState(0);
  // const [deadline, setClaimDeadline] = useState(0);
  // const [approvedWithdraw, setApprovedWithdraw] = useState(0);
  const [lastWithdraw, setLastWithdraw] = useState(0);
  const [nextWithdraw, setNextWithdraw] = useState(0);
  const [totalWithdraw, setTotalWithdraw] = useState(0);
  const [referralReward, setReferralReward] = useState(0);
  const [refTotalWithdraw, setRefTotalWithdraw] = useState(0);
  const [depositValue, setDepositValue] = useState('');
  // const [withdrawValue, setWithdrawValue] = useState('');

  const [pendingMessage, setPendingMessage] = useState('');
  const [calculate, setCalculator] = useState('');

  // const [defaultRef, setDefaultRef] = useState("0x0000000000000000000000000000000000000000");

  // const [roi, setRoi] = useState(8);
  const [isTooltipDisplayed, setIsTooltipDisplayed] = useState(false);
  const [pendingTx, setPendingTx] = useState(false);
  const [curAPY, setCurAPY] = useState('0')
  const [curEpoch, setCurEpoch] = useState(0)

  const queryString = window.location.search;
  const parameters = new URLSearchParams(queryString);
  const newReferral = parameters.get('ref');

  useEffect(() => {
    const referral = window.localStorage.getItem("REFERRAL")

    if (!isAddress(referral, MAINNET)) {
      if (isAddress(newReferral, MAINNET)) {
        window.localStorage.setItem("REFERRAL", newReferral);
      } else {
        window.localStorage.setItem("REFERRAL", ADMIN_ACCOUNT);
      }
    }
    console.log("[PRINCE](referral): ", referral);
  }, [newReferral])

  // const [playing, toggle] = useAudio(music);

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (
      injectedProvider &&
      injectedProvider.provider &&
      typeof injectedProvider.provider.disconnect == "function"
    ) {
      await injectedProvider.provider.disconnect();
    }
    setIsConnected(false);

    window.location.reload();
  };
  const loadWeb3Modal = useCallback(async () => {
    // console.log("Connecting Wallet...");
    const provider = await web3Modal.connect();
    // console.log("provider: ", provider);
    setInjectedProvider(new Web3(provider));
    const acc = provider.selectedAddress
      ? provider.selectedAddress
      : provider.accounts[0];
    const short = shortenAddr(acc);

    setWeb3(new Web3(provider));
    setAbi(getAbi(new Web3(provider)));
    setTokenAbi(getTokenAbi(new Web3(provider)));
    // setAccounts([acc]);
    setCurAcount(acc);
    //     setShorttened(short);
    setIsConnected(true);

    setConnButtonText(short);

    provider.on("chainChanged", (chainId) => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new Web3(provider));
      logoutOfWeb3Modal();
    });

    provider.on("accountsChanged", () => {
      console.log(`curAcount changed!`);
      setInjectedProvider(new Web3(provider));
      logoutOfWeb3Modal();
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    setInterval(() => {
      setRefetch((prevRefetch) => {
        return !prevRefetch;
      });
    }, 10000);
  }, []);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }

    // eslint-disable-next-line
  }, []);

  const shortenAddr = (addr) => {
    if (!addr) return "";
    const first = addr.substr(0, 5);
    const last = addr.substr(38, 41);
    return first + "..." + last;
  };

  useEffect(() => {
    const fetchData = async () => {
      const blockTimestamp = (await web3NoAccount.eth.getBlock('latest')).timestamp;
      console.log("[PRINCE](blockTimestamp): ", blockTimestamp)
      setCurEpoch(Math.floor((blockTimestamp - START_TIME) / EPOCH_LENGTH))
      const totalAmount = await AbiNoAccount.methods.totalAmount().call();
      setTotalAmount(web3NoAccount.utils.fromWei(totalAmount, STAKE_DECIMALS));

      const epochNumberVal = await AbiNoAccount.methods.epochNumber().call();
      const curAPYVal = await AbiNoAccount.methods.apy(parseInt(epochNumberVal) + 1).call();
      setCurAPY(curAPYVal)

      if (curAcount) {
        const refLink = `${REF_PREFIX}` + curAcount;
        setRefLink(refLink);
      }

      if (isConnected && Abi && curAcount) {
        // console.log(curAcount);

        const userBalance = await tokenAbi.methods.balanceOf(curAcount).call();
        setUserBalance(web3NoAccount.utils.fromWei(userBalance, STAKE_DECIMALS));

        const approvedAmount = await tokenAbi.methods.allowance(curAcount, contractAddress).call();
        setUserApprovedAmount(web3NoAccount.utils.fromWei(approvedAmount, STAKE_DECIMALS));

        const lastActionEpochNumber = await Abi.methods.lastActionEpochNumber(curAcount).call();
        console.log("lastActionEpochNumber: ", lastActionEpochNumber)
        const userDepositedAmount = await Abi.methods.amount(curAcount, parseInt(lastActionEpochNumber) + 1).call();
        setUserDepositedAmount(web3NoAccount.utils.fromWei(userDepositedAmount, STAKE_DECIMALS));

        // const dailyRoi = await Abi.methods.DailyRoi(userDepositedAmount.invested).call();
        // setUserDailyRoi(dailyRoi / 10e17);

        // const dailyReward = await Abi.methods.userReward(curAcount).call();
        // setDailyReward(dailyReward / 10e17);

        // const approvedWithdraw = await Abi.methods.approvedWithdrawal(curAcount).call();
        // setApprovedWithdraw(approvedWithdraw.amount / 10e17);

        const totalWithdraw = await Abi.methods.totalRewards(curAcount).call();
        setTotalWithdraw(web3NoAccount.utils.fromWei(totalWithdraw, REWARD_DECIMALS))

        const lastWithdraw = await Abi.methods.lastRewards(curAcount).call();
        setLastWithdraw(web3NoAccount.utils.fromWei(lastWithdraw, REWARD_DECIMALS))

        const nextWithdraw = await Abi.methods.getPendingReward(curAcount).call();
        setNextWithdraw(web3NoAccount.utils.fromWei(nextWithdraw, REWARD_DECIMALS))

        const refEarnedWithdraw = await Abi.methods.referralRewards(curAcount).call();
        setReferralReward(web3NoAccount.utils.fromWei(refEarnedWithdraw, REWARD_DECIMALS));

        const refTotalWithdraw = await Abi.methods.referralTotalRewards(curAcount).call();
        setRefTotalWithdraw(web3NoAccount.utils.fromWei(refTotalWithdraw, REWARD_DECIMALS));
      }

      // const owner = await Abi.methods.owner().call();

      // console.log('Owner: ', owner);
    };

    fetchData();
  }, [isConnected, web3, Abi, tokenAbi, refetch, curAcount]);

  // useEffect(() => {
  //   const TimeLine = async () => {
  //     if (isConnected && Abi) {
  //       //   let claimTime = await Abi.methods.claimTime(curAcount).call();
  //       //   if (claimTime.startTime > 0) {
  //       //     let _claimStart = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(claimTime.startTime + "000");
  //       //     let _claimEnd = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(claimTime.deadline + "000");
  //       //     setClaimStartTime(_claimStart);

  //       //     setClaimDeadline(_claimEnd);

  //       //     let weekly = await Abi.methods.weekly(curAcount).call();
  //       //     let _start = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(weekly.startTime + "000");
  //       //     let _end = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(weekly.deadline + "000");

  //       //     setLastWithdraw(_start);
  //       //     setNextWithdraw(_end);
  //       //   }
  //     }
  //   }
  //   TimeLine();
  //   // eslint-disable-next-line
  // }, [refetch]);

  // buttons

  const ClaimNow = async (e) => {
    try {
      e.preventDefault();
      if (pendingTx) {
        setPendingMessage("Pending...")
        return
      }

      if (nextWithdraw <= 0) {
        setPendingMessage("No Next Rewards!")
        return
      }

      setPendingTx(true)
      if (isConnected && Abi) {
        //  console.log("success")
        setPendingMessage("Claiming...")
        Abi.methods.withdrawReward().send({
          from: curAcount,
        }).then((txHash) => {
          console.log(txHash)
          const txHashString = `${txHash.transactionHash}`
          const msgString = txHashString.substring(0, 8) + "..." + txHashString.substring(txHashString.length - 6)
          setPendingMessage(`Claimed Successfully! txHash is ${msgString}`);
        }).catch((err) => {
          console.log(err)
          setPendingMessage(`Claim Failed because ${err.message}`);
        });

      } else {
        // console.log("connect wallet");
      }
      setPendingTx(false)
    } catch (error) {
      setPendingTx(false)
    }
  };

  // const withDraw = async (e) => {
  //   e.preventDefault();
  //   if (isConnected && Abi) {
  //     //  console.log("success")`1234567 
  //     setPendingMessage("Withdrawing funds")
  //     await Abi.methods.withdrawal().send({
  //       from: curAcount,
  //     });
  //     setPendingMessage("Successfully Withdraw");

  //   } else {
  //     // console.log("connect wallet");
  //   }
  // };

  const refWithdraw = async (e) => {
    try {
      e.preventDefault();
      if (pendingTx) {
        setPendingMessage("Pending...")
        return
      }

      if (referralReward <= 0) {
        setPendingMessage("No Next Referral Rewards!")
        return
      }

      setPendingTx(true)
      if (isConnected && Abi) {
        //  console.log("success")
        setPendingMessage("Referral Rewards withdrawing...")
        await Abi.methods.withdrawReferral().send({
          from: curAcount,
        }).then((txHash) => {
          console.log(txHash)
          const txHashString = `${txHash.transactionHash}`
          const msgString = txHashString.substring(0, 8) + "..." + txHashString.substring(txHashString.length - 6)
          setPendingMessage(`Withdraw Successfully! txHash is ${msgString}`);
        }).catch((err) => {
          console.log(err)
          setPendingMessage(`Withdraw Failed because ${err.message}`);
        });

      } else {
        // console.log("connect wallet");
      }
      setPendingTx(false)
    } catch (error) {
      setPendingTx(false)
    }
  };

  const closeBar = async (e) => {
    e.preventDefault();
    setPendingMessage('');
  }

  const deposit = async (e) => {
    try {
      e.preventDefault();
      if (pendingTx) {
        setPendingMessage("Pending...")
        return
      }

      if (Number.isNaN(parseFloat(depositValue))) {
        setPendingMessage("Input Deposit Amount!")
        return
      }

      if (parseFloat(depositValue) > userBalance) {
        setPendingMessage("Deposit amount must be equal or less than your wallet balance!")
        return
      }

      if (parseFloat(depositValue) < MIN_DEPOSIT_AMOUNT) {
        setPendingMessage("Deposit amount must be equal or greater than minimum deposit amount!")
        return
      }

      if (parseFloat(depositValue) > MAX_DEPOSIT_AMOUNT) {
        setPendingMessage("Deposit amount must be equal or less than maximum deposit amount!")
        return
      }

      setPendingTx(true)
      if (isConnected && Abi) {
        // console.log("success")

        setPendingMessage("Depositing...")
        const _value = web3NoAccount.utils.toWei(depositValue, STAKE_DECIMALS);
        console.log("[PRINCE](deposit): ", _value)

        let referrer = window.localStorage.getItem("REFERRAL");
        referrer = isAddress(referrer, MAINNET) ? referrer : ADMIN_ACCOUNT

        await Abi.methods.deposit(_value, referrer).send({
          from: curAcount
        }).then((txHash) => {
          console.log(txHash)
          const txHashString = `${txHash.transactionHash}`
          const msgString = txHashString.substring(0, 8) + "..." + txHashString.substring(txHashString.length - 6)
          setPendingMessage(`Deposited Successfully! txHash is ${msgString}`);
        }).catch((err) => {
          console.log(err)
          setPendingMessage(`Deposited Failed because ${err.message}`);
        });
      }
      else {
        // console.log("connect wallet");
      }
      setPendingTx(false)
    } catch (error) {
      setPendingTx(false)
    }
  };

  // const unStake = async (e) => {

  //   try {
  //     e.preventDefault();
  // if (pendingTx) {
  //   setPendingMessage("Pending...")
  //   return
  // }
  // 
  //     if (Number.isNaN(parseFloat(withdrawValue))) {
  //       setPendingMessage("Input Withdraw Amount!")
  //       return
  //     }

  //     if (parseFloat(withdrawValue) > userDepositedAmount) {
  //       setPendingMessage("Withdraw amount must be less than your deposited amount!")
  //       return
  //     }

  //     setPendingTx(true)
  //     if (isConnected && Abi) {
  //       setPendingMessage("Unstaking...");
  // const _withdrawValue = web3NoAccount.utils.fromWei(withdrawValue, STAKE_DECIMALS);
  //       console.log("[PRINCE](withdraw): ", _withdrawValue)
  //       await Abi.methods.withdraw(_withdrawValue).send({
  //         from: curAcount,
  //       }).then((txHash) => {
  //         console.log(txHash)
  //         const txHashString = `${txHash.transactionHash}`
  //         const msgString = txHashString.substring(0, 8) + "..." + txHashString.substring(txHashString.length - 6)
  //         setPendingMessage(`UnStaked Successfully! txHash is ${msgString}`);
  //       }).catch((err) => {
  //         console.log(err)
  //         setPendingMessage(`UnStaked Failed because ${err.message}`);
  //       });
  //     }
  //     else {
  //       // console.log("connect Wallet");
  //     }
  //     setPendingTx(false)
  //   } catch (error) {
  //     setPendingTx(false)
  //   }
  // };

  const approve = async (e) => {
    try {
      console.log("[PRINCE](approve): ")
      e.preventDefault();
      if (pendingTx) {
        setPendingMessage("Pending...")
        return
      }

      setPendingTx(true)
      if (isConnected && tokenAbi) {
        setPendingMessage("Approving...");

        await tokenAbi.methods.approve(contractAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").send({
          from: curAcount
        }).then((txHash) => {
          console.log(txHash)
          const txHashString = `${txHash.transactionHash}`
          const msgString = txHashString.substring(0, 8) + "..." + txHashString.substring(txHashString.length - 6)
          setPendingMessage(`Approved Successfully! txHash is ${msgString}`);
        }).catch((err) => {
          console.log(err)
          setPendingMessage(`Approved Failed because ${err.message}`);
        });
      } else {
        console.error("connect Wallet");
      }
      setPendingTx(false)
    } catch (error) {
      setPendingTx(false)
    }
  };


  return (
    <>
      <nav className="navbar navbar-expand-sm navbar-dark" style={{ marginTop: "30px", marginBottom: "20px" }}>
        <div className="container"
          style={{
            justifyContent: isMobile ? 'space-around' : 'space-between',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
          <div style={{ width: "200px", height: "140px" }}></div>
          <button className="btn btn-primary btn-lg btnd btn-custom"
            style={{ background: "#000", color: "#fff", width: "155px" }}
            disabled={pendingTx}
            onClick={isConnected ? logoutOfWeb3Modal : loadWeb3Modal}>
            <i className="fas fa-wallet" style={{ marginRight: "12px" }}>
            </i>
            {connButtonText}
          </button>
        </div>
      </nav>
      <br />
      <div className="container">
        {
          pendingMessage !== '' ?
            <>
              <center>
                <div className="alert alert-warning alert-dismissible" style={{ width: isMobile ? '270px' : '100%' }}>
                  <p onClick={closeBar} className="badge bg-dark" style={{ float: "right", cursor: "pointer" }}>X</p>
                  {pendingMessage}
                </div>
              </center>
            </> : <></>
        }
        <div className="row" style={{ marginBottom: "30px" }}>
          <div className="col-sm-12">
            <div className="card">
              <div className="card-body">
                <div className="top-info">
                  <h2 className="footer-item-text" style={{ display: "flex", flexWrap: "wrap" }}>
                    <a href="/docs/Whitepaper V1.pdf" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> DOCS </a>&nbsp;&nbsp;&nbsp;
                    <a href="https://twitter.com/MangoFinanceCEO" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> TWITTER </a>&nbsp;&nbsp;&nbsp;
                    <a href=" https://t.me/mangofinanceinc" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> TELEGRAM </a>&nbsp;&nbsp;&nbsp;
                    <a href={"https://testnet.bscscan.com/address/" + contractAddress + "#code"} target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> CONTRACT </a>&nbsp;&nbsp;&nbsp;
                    {/* <a href={"https://www.bscscan.com/address/" + contractAddress + "#code"} target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> CONTRACT </a>&nbsp;&nbsp;&nbsp; */}
                    <a href="https://georgestamp.xyz/" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> AUDIT </a>
                  </h2>
                  <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "200", marginBottom: "0px" }}>COPYRIGHT © 2022 TTNBANK Project All rights reserved!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h3 className="subtitle">TOTAL VOLUME</h3>
                  <h3 className="value-text">{Number(totalAmount).toFixed(2)} BUSD</h3>
                </center>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h3 className="subtitle">CURRENT APY</h3>
                  <h3 className="value-text">{curAPY / DENOMINATOR_PERCENT}%</h3>
                </center>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h3 className="subtitle">CURRENT EPOCH</h3>
                  <h3 className="value-text">{curEpoch}</h3>
                </center>
              </div>
            </div>
          </div>
          {/* <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h3 className="subtitle">WITHDRAWAL FEE</h3>
                  <h3 className="value-text">{WITHDRAW_FEE / DENOMINATOR_PERCENT}%</h3>
                </center>
              </div>
            </div>
          </div> */}
          <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h3 className="subtitle">Claim Yield Fee</h3>
                  <h4 className="value-text">{DEPOSIT_FEE / DENOMINATOR_PERCENT}%</h4>
                </center>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br />
      <div className="container">
        <div className="row">
          <div className="col-sm-4">
            <div className="card cardDino">
              <div className="card-body">
                <h4 className="subtitle-normal"><b>MINING PORTAL</b></h4>
                <hr />
                <table className="table">
                  <tbody>
                    <tr>
                      <td><h5 className="content-text"><b>WALLET BALANCE</b></h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(userBalance).toFixed(2)} BUSD</h5></td>
                    </tr>
                    <tr>
                      <td><h5 className="content-text"><b>DEPOSITED</b></h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(userDepositedAmount).toFixed(2)} BUSD</h5></td>
                    </tr>
                    <tr>
                      <td>
                        <input
                          type="number"
                          placeholder="100 BUSD"
                          className="form-control input-box"
                          value={depositValue}
                          step={10}
                          onChange={(e) => setDepositValue(e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-primary btn-lg btn-custom" style={{ width: "123px" }}
                          onClick={Number.isNaN(parseFloat(depositValue)) || userApprovedAmount > parseFloat(depositValue) ? deposit : approve}
                          disabled={pendingTx}
                        >
                          {Number.isNaN(parseFloat(depositValue)) || userApprovedAmount > parseFloat(depositValue) ? 'DEPOSIT' : 'APPROVE'}
                        </button>
                      </td>
                    </tr>
                    {/* <tr>
                      <td>
                        <input
                          type="number"
                          placeholder="100 BUSD"
                          className="form-control input-box"
                          value={withdrawValue}
                          step={10}
                          onChange={(e) => setWithdrawValue(e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-primary btn-lg btn-custom" style={{ width: "123px" }}
                          onClick={unStake}
                          disabled={pendingTx}
                        >
                          UNSTAKE
                        </button>
                      </td>
                    </tr> */}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card cardDino">
              <div className="card-body">
                <h4 className="subtitle-normal"><b>STATISTICS</b></h4>
                <hr />
                <table className="table">
                  <tbody>
                    {/* <tr>
                      <td><h6 className="content-text14" style={{ lineHeight: "20px" }}><b>50% AVAILABLE WITHDRAWAL</b> <br /><span className="value-text">{Number(approvedWithdraw).toFixed(3)} BUSD</span></h6></td>
                      <td style={{ textAlign: "right" }}><button className="btn btn-primary btn-lg btn-custom" onClick={withDraw}>WITHDRAW</button></td>
                    </tr> */}
                    <tr>
                      <td><h5 className="content-text">TOTAL WITHDRAWN</h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(totalWithdraw).toFixed(3)} TTNR</h5></td>
                    </tr>
                    <tr>
                      <td><h5 className="content-text">LAST CLAIM</h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(lastWithdraw).toFixed(3)} TTNR</h5></td>
                    </tr>
                    <tr>
                      <td><h5 className="content-text">NEXT CLAIM</h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(nextWithdraw).toFixed(3)} TTNR</h5></td>
                    </tr>
                    {/* <tr>
                      <td><h6 className="content-text14" style={{ lineHeight: "20px" }}><b>Weekly Yield</b> <br /> <span className="value-text">{Number(dailyReward).toFixed(3)}/{userDailyRoi} TTNR</span></h6></td>
                      <td style={{ textAlign: "right" }}><button className="btn btn-primary btn-lg btn-custom" onClick={ClaimNow} disabled={pendingTx}>CLAIM</button></td>
                    </tr> */}
                  </tbody>
                </table>
                <center>
                  <button className="btn btn-primary btn-lg btn-custom" onClick={ClaimNow} disabled={pendingTx}>CLAIM</button>
                </center>
              </div>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card">
              <div className="card-body">
                <h4 className="subtitle-normal"><b>REFERRAL REWARDS  {REFERRAL_PERCENT / DENOMINATOR_PERCENT}%</b></h4>
                <hr />
                <table className="table">
                  <tbody>
                    <tr>
                      <td><h5 className="content-text">TTNR REWARDS</h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(referralReward).toFixed(2)} TTNR</h5></td>
                    </tr>
                    <tr>
                      <td><h5 className="content-text">TOTAL WITHDRAWN</h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(refTotalWithdraw).toFixed(2)} TTNR</h5></td>
                    </tr>
                  </tbody>
                </table>
                <center> <button className="btn btn-primary btn-lg btn-custom" onClick={refWithdraw} disabled={referralReward <= 0 || pendingTx}>WITHDRAW REWARDS</button> </center>
              </div>
            </div>
            <br />
            <div className="card">
              <div className="card-body">
                <h4 className="subtitle-normal"><b>REFERRAL LINK</b></h4>
                <hr />
                <form>
                  <span className="content-text13">Share your referral link to earn 10% of TTNR </span>
                  <br />
                  <br />
                  <LightTooltip
                    PopperProps={{
                      disablePortal: true,
                    }}
                    open={isTooltipDisplayed}
                    disableFocusListener
                    disableHoverListener
                    disableTouchListener
                    title={`Copied!\n${refLink}`}
                    followCursor
                  >
                    <input type="text" value={refLink} className="form-control input-box" readOnly
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(refLink)
                          setIsTooltipDisplayed(true);
                          setTimeout(() => {
                            setIsTooltipDisplayed(false);
                          }, 5000);
                        }
                      }} />
                  </LightTooltip>
                </form>
              </div>
            </div>
          </div>
        </div>
        <br />
        <div className="row">
          <div className="col-sm-12">
            <div className="card">
              <div className="card-header" style={{ border: "none" }}>
                <h3 className="subtitle-normal">RETURN CALCULATOR</h3>
              </div>
              <div className="card-body" style={{ paddingTop: "0.6rem" }}>
                <div className="row">
                  <div className="col-sm-6">
                    <input
                      type="number"
                      placeholder="100 BUSD"
                      className="form-control input-box"
                      value={calculate}
                      step={10}
                      onChange={(e) => setCalculator(e.target.value)}
                    />
                    <br />
                    <p className="content-text18">Amount of returns calculated on the basis of deposit amount.
                      <br />
                      <b>Note:</b> Min deposit is 20 BUSD & max deposit is 25,000 BUSD.</p>
                  </div>
                  <div className="col-sm-6" style={{ textAlign: "right" }}>
                    <h3 className="subtitle-normal" style={{ fontSize: "16px" }}>ROI</h3>
                    <p className="content-text">
                      DAILY RETURN: <span className="value-text">{Number(calculate * curAPY / DENOMINATOR / 7).toFixed(3)} TTNR</span> <br />
                      WEEKLY RETURN: <span className="value-text">{Number(calculate * curAPY / DENOMINATOR).toFixed(3)} TTNR</span>  <br />
                      MONTHLY RETURN: <span className="value-text">{Number(calculate * curAPY / DENOMINATOR * 4.345).toFixed(3)} TTNR</span>  <br />
                      Anual RETURN: <span className="value-text">{Number(calculate * curAPY / DENOMINATOR * 52.1428).toFixed(3)} TTNR</span> </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <br />
        <div style={{ width: "100%", height: "100vh" }}></div>
      </div>
    </>);
}

export default Interface;
