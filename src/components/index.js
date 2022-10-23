import { useCallback, useEffect, useState } from "react";
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import web3ModalSetup from "./../helpers/web3ModalSetup";
import Web3 from "web3";
import {
  getAbi,
  getTokenAbi,
  REFERRAL_PERCENT,
  WITHDRAW_FEE,
  DENOMINATOR,
  DENOMINATOR_PERCENT,
  DECIMALS,
  EPOCH_LENGTH,
  TTNBANK,
  START_TIME,
  RPC_URL,
  MAINNET,
  ADMIN_ACCOUNT,
  REF_PREFIX,
  TREASURY,
  WITHDRAW_TIME
} from "../Abi";
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
    fontSize: 14,
  },
}));

const httpProvider = new Web3.providers.HttpProvider(RPC_URL)
const web3NoAccount = new Web3(httpProvider)
const isAddress = web3NoAccount.utils.isAddress
const tokenAbiNoAccount = getTokenAbi(web3NoAccount)
const AbiNoAccount = getAbi(web3NoAccount)

const displayRemainTime = (seconds) => {
  if (seconds > 0) {
    // Calculating the days, hours, minutes and seconds left
    const timeDays = Math.floor(seconds / (60 * 60 * 24))
    const timeHours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60))
    const timeMinutes = Math.floor((seconds % (60 * 60)) / 60)

    if (timeDays > 0) {
      return `${timeDays}D : ${timeHours}H`
    } else {
      return `${timeHours}H : ${timeMinutes}M`
    }
  }

  return `0H : 0M`
}

const Interface = () => {
  const isMobile = window.matchMedia("only screen and (max-width: 1000px)").matches;

  const queryString = window.location.search;
  const parameters = new URLSearchParams(queryString);
  const newReferral = parameters.get('ref');

  const [Abi, setAbi] = useState();
  const [tokenAbi, setTokenAbi] = useState();
  const [web3, setWeb3] = useState();
  const [isConnected, setIsConnected] = useState(false);
  const [injectedProvider, setInjectedProvider] = useState();
  const [refetch, setRefetch] = useState(true);
  const [curAcount, setCurAcount] = useState(null);
  const [connButtonText, setConnButtonText] = useState("CONNECT");
  const [refLink, setRefLink] = useState(`${REF_PREFIX}0x0000000000000000000000000000000000000000`);

  const [pendingMessage, setPendingMessage] = useState('');
  const [calculate, setCalculator] = useState('');
  const [pendingTx, setPendingTx] = useState(false);
  const [isTooltipDisplayed, setIsTooltipDisplayed] = useState(false);

  const [depositValue, setDepositValue] = useState('');
  const [withdrawValue, setWithdrawValue] = useState('');
  const [withdrawRequestValue, setWithdrawRequestValue] = useState('');

  const [treasuryAmount, setTreasuryAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [curAPY, setCurAPY] = useState('0')
  const [userBalance, setUserBalance] = useState(0);
  const [userApprovedAmount, setUserApprovedAmount] = useState(0);
  const [userDepositedAmount, setUserDepositedAmount] = useState(0);
  const [referralReward, setReferralReward] = useState(0);
  const [refTotalWithdraw, setRefTotalWithdraw] = useState(0);
  const [nextWithdraw, setNextWithdraw] = useState(0);
  const [userInfo, setUserInfo] = useState({});
  const [enabledAmount, setEnabledAmount] = useState(0);
  const [curEpoch, setCurEpoch] = useState(0)

  const [remainTime, setRemainTime] = useState(0)
  const [withdrawState, setWithdrawState] = useState(false)

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
      try {
        const blockTimestamp = (await web3NoAccount.eth.getBlock('latest')).timestamp;
        const curEpochVal = START_TIME > blockTimestamp ? 0 : Math.floor((blockTimestamp - START_TIME) / EPOCH_LENGTH + 1)
        setCurEpoch(curEpochVal)

        const epoch = curEpochVal > 0 ? curEpochVal : 1
        const closeTime = (START_TIME + (epoch - 1) * EPOCH_LENGTH + WITHDRAW_TIME)

        if (blockTimestamp < closeTime && curEpochVal > 1) {
          setRemainTime(closeTime - blockTimestamp)
          setWithdrawState(true)
        } else {
          setWithdrawState(false)
          const openTime = (START_TIME + epoch * EPOCH_LENGTH)
          setRemainTime(openTime - blockTimestamp)
        }

        const totalAmount = await AbiNoAccount.methods.totalAmount().call();
        setTotalAmount(web3NoAccount.utils.fromWei(totalAmount, DECIMALS));

        const treasuryAmount = await tokenAbiNoAccount.methods.balanceOf(TREASURY).call();
        setTreasuryAmount(web3NoAccount.utils.fromWei(treasuryAmount, DECIMALS));

        const epochNumberVal = await AbiNoAccount.methods.epochNumber().call();
        const curAPYVal = await AbiNoAccount.methods.apy(epochNumberVal).call();
        setCurAPY(curAPYVal)

        if (curAcount) {
          const refLink = `${REF_PREFIX}` + curAcount;
          setRefLink(refLink);
        }

        if (isConnected && Abi && curAcount) {
          // console.log(curAcount);

          const userBalance = await tokenAbi.methods.balanceOf(curAcount).call();
          setUserBalance(web3NoAccount.utils.fromWei(userBalance, DECIMALS));

          const approvedAmount = await tokenAbi.methods.allowance(curAcount, TTNBANK).call();
          setUserApprovedAmount(web3NoAccount.utils.fromWei(approvedAmount, DECIMALS));


          const nextWithdraw = await Abi.methods.getPendingReward(curAcount).call();
          setNextWithdraw(web3NoAccount.utils.fromWei(nextWithdraw, DECIMALS))

          const refEarnedWithdraw = await Abi.methods.referralRewards(curAcount).call();
          setReferralReward(web3NoAccount.utils.fromWei(refEarnedWithdraw, DECIMALS));

          const refTotalWithdraw = await Abi.methods.referralTotalRewards(curAcount).call();
          setRefTotalWithdraw(web3NoAccount.utils.fromWei(refTotalWithdraw, DECIMALS));

          const userInfo = await Abi.methods.userInfo(curAcount).call();
          console.log("[PRINCE](userInfo): ", userInfo)
          setUserInfo(userInfo)

          const userDepositedAmount = await Abi.methods.amount(curAcount, parseInt(userInfo[3])).call();
          setUserDepositedAmount(web3NoAccount.utils.fromWei(userDepositedAmount, DECIMALS));

          const enabledAmount = parseInt(userInfo[1]) > 0 ? (await Abi.methods.amount(curAcount, parseInt(userInfo[1]) - 1).call()) : "0"
          setEnabledAmount(web3NoAccount.utils.fromWei(enabledAmount, DECIMALS))
        }

        // const owner = await Abi.methods.owner().call();

        // console.log('Owner: ', owner);
      } catch (error) {
        console.log('fetchData error: ', error);
      }
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
        Abi.methods.withdraw("0").send({
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

      if (parseFloat(depositValue) < 0) {
        setPendingMessage("Deposit amount must be equal or greater than 0 BUSD!")
        return
      }

      setPendingTx(true)
      if (isConnected && Abi) {
        // console.log("success")

        setPendingMessage("Depositing...")
        const _value = web3NoAccount.utils.toWei(depositValue, DECIMALS);
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

  const unStake = async (e) => {
    try {
      e.preventDefault();
      if (pendingTx) {
        setPendingMessage("Pending...")
        return
      }

      if (Number.isNaN(parseFloat(withdrawValue))) {
        setPendingMessage("Input Withdraw Amount!")
        return
      }

      if (parseFloat(withdrawValue) > userDepositedAmount) {
        setPendingMessage("Withdraw amount must be less than your deposited amount!")
        return
      }

      setPendingTx(true)
      if (isConnected && Abi) {
        setPendingMessage("Unstaking...");
        const _withdrawValue = web3NoAccount.utils.toWei(withdrawValue, DECIMALS);
        console.log("[PRINCE](withdraw): ", _withdrawValue)
        await Abi.methods.withdraw(_withdrawValue).send({
          from: curAcount,
        }).then((txHash) => {
          console.log(txHash)
          const txHashString = `${txHash.transactionHash}`
          const msgString = txHashString.substring(0, 8) + "..." + txHashString.substring(txHashString.length - 6)
          setPendingMessage(`UnStaked Successfully! txHash is ${msgString}`);
        }).catch((err) => {
          console.log(err)
          setPendingMessage(`UnStaked Failed because ${err.message}`);
        });
      }
      else {
        // console.log("connect Wallet");
      }
      setPendingTx(false)
    } catch (error) {
      setPendingTx(false)
    }
  };

  const withdrawRequest = async (e) => {
    try {
      e.preventDefault();
      if (pendingTx) {
        setPendingMessage("Pending...")
        return
      }

      if (Number.isNaN(parseFloat(withdrawRequestValue))) {
        setPendingMessage("Input Request Amount!")
        return
      }

      setPendingTx(true)
      if (isConnected && Abi) {
        setPendingMessage("Requesting...");
        const _withdrawRequestValue = web3NoAccount.utils.toWei(withdrawRequestValue, DECIMALS);
        console.log("[PRINCE](withdrawRequest): ", _withdrawRequestValue)
        await Abi.methods.withdrawRequest(_withdrawRequestValue).send({
          from: curAcount,
        }).then((txHash) => {
          console.log(txHash)
          const txHashString = `${txHash.transactionHash}`
          const msgString = txHashString.substring(0, 8) + "..." + txHashString.substring(txHashString.length - 6)
          setPendingMessage(`Requested Successfully! txHash is ${msgString}`);
        }).catch((err) => {
          console.log(err)
          setPendingMessage(`Requested Failed because ${err.message}`);
        });
      }
      else {
        // console.log("connect Wallet");
      }
      setPendingTx(false)
    } catch (error) {
      setPendingTx(false)
    }
  };

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

        await tokenAbi.methods.approve(TTNBANK, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").send({
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
      <nav className="navbar navbar-expand-sm navbar-dark" style={{ marginTop: "30px" }}>
        <div className="container"
          style={{
            justifyContent: isMobile ? 'space-around' : 'space-between',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
          <div style={{ width: "200px" }}></div>
          {/* <div style={{ width: "200px", height: "140px" }}></div> */}
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
      <div className="container">
        <div className="row" style={{ marginBottom: "20px" }}>
          <div className="col-sm-12">
            <div className="card">
              <div className="card-body">
                <div className="top-info">
                  <h2 className="footer-item-text" style={{ display: "flex", flexWrap: "wrap" }}>
                    <a href="/docs/Whitepaper V1.pdf" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> DOCS </a>&nbsp;&nbsp;&nbsp;
                    <a href="https://twitter.com/MangoFinanceCEO" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> TWITTER </a>&nbsp;&nbsp;&nbsp;
                    <a href=" https://t.me/mangofinanceinc" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> TELEGRAM </a>&nbsp;&nbsp;&nbsp;
                    <a href={"https://testnet.bscscan.com/address/" + TTNBANK + "#code"} target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> CONTRACT </a>&nbsp;&nbsp;&nbsp;
                    {/* <a href={"https://www.bscscan.com/address/" + TTNBANK + "#code"} target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> CONTRACT </a>&nbsp;&nbsp;&nbsp; */}
                    <a href="https://georgestamp.xyz/" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}> AUDIT </a>
                  </h2>
                  <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "200", marginBottom: "0px" }}>COPYRIGHT © 2022 TTNBANK Project All rights reserved!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
        <div className="row">
          <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h4 className="subtitle">TREASURY</h4>
                  <h4 className="value-text">{Number(treasuryAmount).toFixed(2)} BUSD</h4>
                </center>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h4 className="subtitle">CURRENT APY</h4>
                  <h4 className="value-text">{curAPY / DENOMINATOR_PERCENT * 12}%</h4>
                </center>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h4 className="subtitle">CURRENT EPOCH</h4>
                  <h4 className="value-text">{curEpoch}</h4>
                </center>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="card">
              <div className="card-body">
                <center>
                  <h4 className="subtitle">CLAIM YIELD FEE</h4>
                  <h4 className="value-text">{WITHDRAW_FEE / DENOMINATOR_PERCENT}%</h4>
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
                <h4 className="subtitle-normal" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                  <b>BANK</b>
                  <b style={{ color: "rgb(254 222 91)" }}>{Number(totalAmount).toFixed(2)} BUSD</b>
                </h4>
                <hr />
                <table className="table">
                  <tbody>
                    <tr>
                      <td><h5 className="content-text"><b>WALLET</b></h5></td>
                      <td style={{ textAlign: "right", width: "160px" }}><h5 className="value-text">{Number(userBalance).toFixed(2)} BUSD</h5></td>
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
                          min={0}
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
                  </tbody>
                </table>
              </div>
            </div>
            <br />
            <div className="card">
              <div className="card-body">
                <h4 className="subtitle-normal"><b>REFERRAL REWARDS  {REFERRAL_PERCENT / DENOMINATOR_PERCENT}%</b></h4>
                <hr />
                <table className="table">
                  <tbody>
                    <tr>
                      <td><h5 className="content-text">BUSD REWARDS</h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(referralReward).toFixed(2)} BUSD</h5></td>
                    </tr>
                    <tr>
                      <td><h5 className="content-text">TOTAL</h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(refTotalWithdraw).toFixed(2)} BUSD</h5></td>
                    </tr>
                  </tbody>
                </table>
                <center> <button className="btn btn-primary btn-lg btn-custom" onClick={refWithdraw} disabled={referralReward <= 0 || pendingTx}>WITHDRAW REWARDS</button> </center>
              </div>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card cardDino">
              <div className="card-body">
                <h4 className="subtitle-normal"><b>CLAIM REWARDS</b></h4>
                <hr />
                <table className="table">
                  <tbody>
                    {/* <tr>
                      <td><h6 className="content-text14" style={{ lineHeight: "20px" }}><b>50% AVAILABLE WITHDRAWAL</b> <br /><span className="value-text">{Number(approvedWithdraw).toFixed(3)} BUSD</span></h6></td>
                      <td style={{ textAlign: "right" }}><button className="btn btn-primary btn-lg btn-custom" onClick={withDraw}>WITHDRAW</button></td>
                    </tr> */}
                    <tr>
                      <td><h5 className="content-text">TOTAL</h5></td>
                      <td style={{ textAlign: "right" }}><h5 className="value-text">{Number(web3NoAccount.utils.fromWei(userInfo && Object.keys(userInfo).length > 0 ? userInfo[5] : "0", DECIMALS)).toFixed(3)} BUSD</h5></td>
                    </tr>
                    <tr>
                      <td>
                        <h6 className="content-text" style={{ lineHeight: "20px" }}>
                          <b>LAST CLAIM</b><br /><span className="value-text">{Number(web3NoAccount.utils.fromWei(userInfo && Object.keys(userInfo).length > 0 ? userInfo[4] : "0", DECIMALS)).toFixed(3)} BUSD</span>
                        </h6>
                      </td>
                      <td style={{ textAlign: "right", width: "160px" }} >
                        <h6 className="content-text" style={{ lineHeight: "20px" }}>
                          <b>NEXT CLAIM</b><br /><span className="value-text">{Number(nextWithdraw).toFixed(3)} BUSD</span>
                        </h6>
                      </td>
                    </tr>
                    {/* <tr>
                      <td><h6 className="content-text14" style={{ lineHeight: "20px" }}><b>Weekly Yield</b> <br /> <span className="value-text">{Number(dailyReward).toFixed(3)}/{userDailyRoi} BUSD</span></h6></td>
                      <td style={{ textAlign: "right" }}><button className="btn btn-primary btn-lg btn-custom" onClick={ClaimNow} disabled={pendingTx}>CLAIM</button></td>
                    </tr> */}
                  </tbody>
                </table>
                <center>
                  <button className="btn btn-primary btn-lg btn-custom" onClick={ClaimNow} disabled={pendingTx || nextWithdraw <= 0}>CLAIM</button>
                </center>
              </div>
            </div>
            <br />
            <div className="card">
              <div className="card-body">
                <h4 className="subtitle-normal"><b>REFERRAL LINK</b></h4>
                <hr />
                <form>
                  <span className="content-text13">Share your referral link to earn {REFERRAL_PERCENT / DENOMINATOR_PERCENT}% of BUSD </span>
                  <br />
                  <LightTooltip
                    PopperProps={{
                      disablePortal: true,
                    }}
                    open={isTooltipDisplayed}
                    disableFocusListener
                    disableHoverListener
                    disableTouchListener
                    title={`Copied! ${refLink}`}
                    followCursor
                  >
                    <input type="text"
                      className="form-control input-box" readOnly
                      style={{ marginTop: "10px", fontSize: "15px" }}
                      value={refLink}
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
          <div className="col-sm-4">
            <div className="card">
              <div className="card-body">
                <h4 className="subtitle-normal">
                  <b>WITHDRAW</b>
                </h4>
                <hr />
                <table className="table">
                  <tbody>
                    <tr>
                      <td><h5 className="content-text">{withdrawState ? "Opening..." : "Remain Time:"}</h5></td>
                      <td style={{ textAlign: "right" }}>
                        <h5 className="value-text">
                          {displayRemainTime(remainTime)}
                        </h5>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <h6 className="content-text" style={{ lineHeight: "20px" }}>
                          <b>ENABLE</b><br /><span className="value-text">{Number(enabledAmount).toFixed(2)} BUSD</span>
                        </h6>
                      </td>
                      <td style={{ textAlign: "right", width: "160px" }} >
                        <h6 className="content-text" style={{ lineHeight: "20px" }}>
                          <b>REQUESTED</b><br />
                          <span className="value-text">
                            {Number(web3NoAccount.utils.fromWei(userInfo && Object.keys(userInfo).length > 0 ? userInfo[0] : "0", DECIMALS)).toFixed(2)} BUSD
                          </span>
                        </h6>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <input
                          type="number"
                          placeholder="100 BUSD"
                          min={0}
                          className="form-control input-box"
                          value={withdrawRequestValue}
                          step={10}
                          onChange={(e) => setWithdrawRequestValue(e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-primary btn-lg btn-custom" style={{ width: "123px" }}
                          onClick={withdrawRequest}
                          disabled={pendingTx}
                        >
                          REQUEST
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <input
                          type="number"
                          placeholder="100 BUSD"
                          min={0}
                          className="form-control input-box"
                          value={withdrawValue}
                          step={10}
                          onChange={(e) => setWithdrawValue(e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-primary btn-lg btn-custom" style={{ width: "123px" }}
                          onClick={unStake}
                          disabled={
                            pendingTx ||
                            !withdrawState ||
                            Number.isNaN(withdrawValue) ||
                            parseFloat(withdrawValue) > enabledAmount ||
                            parseFloat(web3NoAccount.utils.fromWei(userInfo && Object.keys(userInfo).length > 0 ? userInfo[0] : "0", DECIMALS))
                          }
                        >
                          WITHDRAW
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
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
                      DAILY RETURN: <span className="value-text">{Number(calculate * curAPY / DENOMINATOR / 7).toFixed(3)} BUSD</span> <br />
                      WEEKLY RETURN: <span className="value-text">{Number(calculate * curAPY / DENOMINATOR).toFixed(3)} BUSD</span>  <br />
                      MONTHLY RETURN: <span className="value-text">{Number(calculate * curAPY / DENOMINATOR * 4.345).toFixed(3)} BUSD</span>  <br />
                      Anual RETURN: <span className="value-text">{Number(calculate * curAPY / DENOMINATOR * 52.1428).toFixed(3)} BUSD</span> </p>
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
