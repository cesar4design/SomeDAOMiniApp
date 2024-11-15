'use client'

import { SetStateAction, useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { doc, onSnapshot, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import { useTonAddress, useTonConnectUI, } from '@tonconnect/ui-react';
import { TonConnectButton } from "@tonconnect/ui-react";

import "./page.css";

interface UserData {
  id: number;
  username: string;
  points: number;
  profileImg: string;
}


export default function Home() {
  const [userData, setUserData] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [lastBoostTimestamp, setLastBoostTimestamp] = useState<Date | null>(null); // Timestamp del último reclamo
  const [nextBoostClaimTime, setNextBoostClaimTime] = useState<string | null>(null); // Tiempo restante para el próximo reclamo
  const [canClaim, setCanClaim] = useState<boolean>(true); // Para habilitar/deshabilitar el reclamo
  const [nextClaimTime, setNextClaimTime] = useState<string | null>(null); // Tiempo restante para el próximo reclamo
  const [invitedFriends, setInvitedFriends] = useState<UserData[]>([]);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);

  useEffect(() => {
    if (WebApp.initDataUnsafe.user) {
      const user = WebApp.initDataUnsafe.user;
      setUserData(user);

      const userDoc = doc(db, 'users', user.id.toString());

      const unsubscribe = onSnapshot(userDoc, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setPoints(data.points || 0);
          setCompletedTasks(data.completedTasks || {});
          setLastBoostTimestamp(data.lastBoostClaim ? data.lastBoostClaim.toDate() : null);
          handleClaimAvailability(data.lastBoostClaim);
          setIsNewUser(data.isNewUser || {});

        }

      });

      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const fetchInvitedUsers = async () => {
      if (WebApp.initDataUnsafe.user) {
        const user = WebApp.initDataUnsafe.user;
        const userDoc = doc(db, 'users', user.id.toString());

        // Obtener el documento del usuario actual
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          const invitedUsers = userSnapshot.data()?.invitedUsers || [];

          // Obtener la información de los amigos invitados
          const friendsData: UserData[] = [];
          for (const invitedUserId of invitedUsers) {
            const invitedUserDoc = doc(db, 'users', invitedUserId);
            const invitedUserSnapshot = await getDoc(invitedUserDoc);
            if (invitedUserSnapshot.exists()) {
              const invitedUserData = invitedUserSnapshot.data();
              friendsData.push({
                id: invitedUserId,
                username: invitedUserData?.telegramUsername || 'Unknown User',
                profileImg: invitedUserData?.profileImageUrl || 'Unknown User',
                points: invitedUserData?.points || 0,
              });
            }
          }

          // Establecer los datos de los amigos invitados
          setInvitedFriends(friendsData);
        }
      }
    };

    fetchInvitedUsers();
  }, []);

  // TON Connect //

  const userFriendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const tonConnectUIS = useTonConnectUI();

  const handleTonWalletConnect = async () => {
    try {
      const [tonConnect] = tonConnectUIS;

      if (!userFriendlyAddress) {
        await tonConnect.openModal();
      }

      else {
        // Si está conectado, mostrar/ocultar el menú
        setMenuOpen(!menuOpen);
      }

    } catch (error) {
      console.error("Error connecting to Ton Wallet:", error);
    }
  };

  const handleDisconnect = () => {
    const [tonConnect] = tonConnectUIS;
    tonConnect.disconnect();  // Llamada para desconectar
    setMenuOpen(false);  // Cerrar el menú desplegable
  };

  const handleClose = () => {
    setMenuOpen(false);
  };

  const handleTonWalletClaim = async () => {
    if (completedTasks['connect_ton_wallet']) return;

    const [tonConnect] = tonConnectUIS;

    if (!userFriendlyAddress) {
      await tonConnect.openModal();
    }

    if (userFriendlyAddress) {
      const userDocRef = doc(db, 'users', userData.id.toString());
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          connect_ton_wallet: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 500,
        tonWalletAddress: userFriendlyAddress
      });

    }

  };

  // TON Boost //

  const [tonConnectUI] = useTonConnectUI()
  const [transactionStatus, setTransactionStatus] = useState('')

  const sendTon = async () => {
    if (!canClaim) return;
    if (!tonConnectUI.connected) {
      setTransactionStatus('Por favor, conecta tu wallet primero.')
      return
    }

    const now = new Date();

    const destinationAddress = 'UQBYEPdFbidxjay1Qj3ZfUCHiduLskXqBMDg5GIxt1Napm6f' // Dirección predeterminada
    const userDocRef = doc(db, 'users', userData.id.toString());

    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds from now
        messages: [
          {
            address: destinationAddress,
            amount: '39000000', // 0.039 TON in nanotons
          },
        ],
      }

      const result = await tonConnectUI.sendTransaction(transaction);

      // Verificamos si la transacción fue exitosa y cambiamos la variable a true
      if (result.boc) {
        setTransactionStatus(`¡Transacción enviada! Hash: ${result.boc}`);

        const now = new Date();

        await updateDoc(userDocRef, {
          completedTasks: {
            ...(await getDoc(userDocRef)).data()?.completedTasks,
            buy_boost: true,
          },
          points: (await getDoc(userDocRef)).data()?.points + 3000,
          lastBoostClaim: Timestamp.fromDate(now),

        });

        setCanClaim(false); // Desactiva el reclamo después de hacerlo
        handleClaimAvailability(Timestamp.fromDate(now));

      } else {
        setTransactionStatus('Error: No se recibió el BoC de la transacción.');
      }

    } catch (error) {
      setTransactionStatus(`Error`);
    }
  }

  const handleClaimAvailability = (lastBoostTimestamp: Timestamp | null) => {
    if (!lastBoostTimestamp) {
      setCanClaim(true);
      setNextClaimTime(null);
      return;
    }

    const now = new Date();
    const lastClaimDate = lastBoostTimestamp.toDate();
    const nextClaim = new Date(lastClaimDate.getTime() + 24 * 60 * 60 * 1000);

    if (now >= nextClaim) {
      setCanClaim(true);
      setNextClaimTime(null);
    } else {
      setCanClaim(false);
      const timeLeft = nextClaim.getTime() - now.getTime();
      updateNextClaimTime(timeLeft);
    }
  };

  // Función que actualiza el tiempo restante para el próximo reclamo
  const updateNextClaimTime = (timeLeft: number) => {
    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    setNextClaimTime(`${hours}h ${minutes}m ${seconds}s`);

    // Actualiza el tiempo restante cada segundo
    setTimeout(() => {
      updateNextClaimTime(timeLeft - 1000);
    }, 1000);
  };

  // Socials tasks //

  const [isLoading, seIsLoading] = useState(false);
  const [isLoadingX, seIsLoadingX] = useState(false);
  const [isLoadingAnn, seIsLoadingAnn] = useState(false);
  const [isLoadingDiscord, seIsLoadingDiscord] = useState(false);
  const [isLoadingMedium, seIsLoadingMedium] = useState(false);
  const [isLoadingWarpcast, seIsLoadingWarpcast] = useState(false);
  const [isLoadingLens, seIsLoadingLens] = useState(false);

  const [isLoadingRetweet, setIsLoadingRetweet] = useState(false);
  const [isLoadingFollowSersilverstone, setIsLoadingFollowSersilverstone] = useState(false);

  const handleFollowTwitter = async () => {
    if (completedTasks['follow_twitter'] || isLoading || isLoadingX) return;
    seIsLoading(true);
    seIsLoadingX(true);
    window.open('https://x.com/someDAO_', '_blank');
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          follow_twitter: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 300,
      });
      seIsLoading(false);
      seIsLoadingX(false);
    }, 8000);
  };

  const handleJoinChannel = async () => {
    if (completedTasks['join_channel'] || isLoading || isLoadingAnn) return;
    seIsLoading(true);
    seIsLoadingAnn(true);
    window.open('https://t.me/somedaoann', '_blank');
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      const botToken = "8158006302:AAF7MKdPwnveVELASnHLQnGqG-dcKOlwRrI";
      const telegramUserId = userData.id.toString();
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@somedaoann&user_id=${telegramUserId}`
      );
      const data = await response.json();

      if (data.result && ['member', 'administrator', 'restricted'].includes(data.result.status)) {
        await updateDoc(userDocRef, {
          completedTasks: {
            ...(await getDoc(userDocRef)).data()?.completedTasks,
            join_channel: true,
          },
          points: (await getDoc(userDocRef)).data()?.points + 300,
        });
        seIsLoading(false);
        seIsLoadingAnn(false);
      } else {
        seIsLoading(false);
        seIsLoadingAnn(false);
      }

    }, 10000);

  };


  const handleJoinDiscord = async () => {
    if (completedTasks['join_discord'] || isLoading || isLoadingDiscord) return;
    seIsLoading(true);
    seIsLoadingDiscord(true);
    window.open('https://discord.com/invite/AE8HvVtgNj', '_blank');
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          join_discord: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 300,
      });
      seIsLoading(false);
      seIsLoadingDiscord(false);
    }, 8000);
  };

  const handleFollowMedium = async () => {
    if (completedTasks['follow_medium'] || isLoading || isLoadingMedium) return;
    seIsLoading(true);
    seIsLoadingMedium(true);
    window.open('https://somedao.medium.com/', '_blank');
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          follow_medium: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 300,
      });
      seIsLoading(false);
      seIsLoadingMedium(false);
    }, 8000);
  };

  const handleFollowWarpcast = async () => {
    if (completedTasks['follow_warpcast'] || isLoading || isLoadingWarpcast) return;
    seIsLoading(true);
    seIsLoadingWarpcast(true);
    window.open('https://warpcast.com/somedao', '_blank');
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          follow_warpcast: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 300,
      });
      seIsLoading(false);
      seIsLoadingWarpcast(false);
    }, 8000);
  };

  const handleFollowLens = async () => {
    if (completedTasks['follow_lens'] || isLoading || isLoadingLens) return;
    seIsLoading(true);
    seIsLoadingLens(true);
    window.open('https://hey.xyz/u/somedao', '_blank');
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          follow_lens: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 300,
      });
      seIsLoading(false);
      seIsLoadingLens(false);
    }, 8000);
  };

  // Time-limited tasks //

  const handleRetweet = async () => {
    if (completedTasks['twitter_retweet'] || isLoading || isLoadingRetweet) return;
    seIsLoading(true);
    setIsLoadingRetweet(true);
    window.open('https://x.com/intent/retweet?tweet_id=1768044874819895461', '_blank');
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          twitter_retweet: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 300,
      });
      seIsLoading(false);
      setIsLoadingRetweet(false);
    }, 8000);
  };

  const handleFollowSersilverstone = async () => {
    if (completedTasks['twitter_follow_sersilverstone'] || isLoading || isLoadingFollowSersilverstone) return;
    seIsLoading(true);
    setIsLoadingFollowSersilverstone(true);
    window.open('https://x.com/sersilverstone ', '_blank');
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          twitter_follow_sersilverstone: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 300,
      });
      seIsLoading(false);
      setIsLoadingFollowSersilverstone(false);
    }, 8000);
  };

  // Invite friends tasks //

  const handle1Friends = async () => {
    if (completedTasks['invite1friends']) return;
    if (invitedFriends.length < 1) return;
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          invite1friends: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 400,
      });

    }, 10);
  };

  const handle3Friends = async () => {
    if (completedTasks['invite3friends']) return;
    if (invitedFriends.length < 3) return;
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          invite3friends: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 1200,
      });

    }, 10);
  };

  const handle5Friends = async () => {
    if (completedTasks['invite5friends']) return;
    if (invitedFriends.length < 5) return;
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          invite5friends: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 2000,
      });

    }, 10);
  };

  const handle10Friends = async () => {
    if (completedTasks['invite10friends']) return;
    if (invitedFriends.length < 10) return;
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        completedTasks: {
          ...(await getDoc(userDocRef)).data()?.completedTasks,
          invite10friends: true,
        },
        points: (await getDoc(userDocRef)).data()?.points + 4000,
      });

    }, 10);
  };

  // Input EVM task //

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoadingManualTask, setIsLoadingManualTask] = useState(false);
  const [completedManualTask, setCompletedManualTask] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: { target: { value: SetStateAction<string>; }; }) => {
    setInputText(e.target.value);
  };

  const handleConfirmTask = async () => {
    if (completedManualTask || isLoadingManualTask || !inputText) return;

    setIsLoadingManualTask(true);

    const userDocRef = doc(db, 'users', userData.id.toString());

    await updateDoc(userDocRef, {
      manualTaskInput: inputText,
      completedTasks: {
        ...(await getDoc(userDocRef)).data()?.completedTasks,
        input_EVM_task: true,
      },
      points: (await getDoc(userDocRef)).data()?.points + 500,
    });

    setCompletedManualTask(true);
    setIsLoadingManualTask(false);
    handleCloseModal();
  };

  // Input secret code task //

  const [isModalOpenCode, setIsModalOpenCode] = useState(false);
  const [inputTextCode, setInputTextCode] = useState('');
  const [isLoadingManualTaskCode, setIsLoadingManualTaskCode] = useState(false);
  const [completedManualTaskCode, setCompletedManualTaskCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleOpenModalCode = () => {
    setIsModalOpenCode(true);
  };

  const handleCloseModalCode = () => {
    setIsModalOpenCode(false);
  };

  const handleInputChangeCode = (e: { target: { value: SetStateAction<string>; }; }) => {
    setInputTextCode(e.target.value);
  };

  const handleConfirmTaskCode = async () => {
    if (completedManualTaskCode || isLoadingManualTaskCode || !inputTextCode) return;

    if (inputTextCode !== "MOONVEMBER") {
      setErrorMessage(' Invalid code, please enter a correct code.');
      return;
    }

    setIsLoadingManualTaskCode(true);

    const userDocRef = doc(db, 'users', userData.id.toString());

    await updateDoc(userDocRef, {
      completedTasks: {
        ...(await getDoc(userDocRef)).data()?.completedTasks,
        input_code_task: true,
      },
      points: (await getDoc(userDocRef)).data()?.points + 500,
    });

    setCompletedManualTaskCode(true);
    setIsLoadingManualTaskCode(false);
    handleCloseModalCode();
  };

  // New user reward //

  const handleNewUserReward = async () => {
    if (!isNewUser) return;
    const userDocRef = doc(db, 'users', userData.id.toString());

    setTimeout(async () => {
      await updateDoc(userDocRef, {
        points: (await getDoc(userDocRef)).data()?.points + 1000,
        isNewUser: false
      });

      setIsNewUser(false);

    }, 10);
  };


  return <>

    <section className='main-section'>
      <section className='top-section'>
        <img src="coin.svg" alt="" />
        <h1>{points.toLocaleString('en-US')} $SOME</h1>
        <p>Keep stacking up!</p>
      </section>

      <section className='boost-task'>
        <div className='boost-task-title'>
          <div className='boost-task-title-icon'>
            <img src="coin.svg" alt="" />
            <h3>Boost</h3>
          </div>
          <h3 className='counter-text'>{nextClaimTime}</h3>
        </div>
        <div className={!canClaim ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Boost $SOME</p>
            <p className='points-text'>+3000</p>
          </div>
          <button onClick={sendTon} >
            {!canClaim ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Claim'}
          </button>
        </div>
      </section>

      <section className='boost-task'>
        <div className='boost-task-title'>
          <div className='boost-task-title-icon'>
            <img src="coin.svg" alt="" />
            <h3>Time-limited tasks</h3>
          </div>
        </div>
       {!completedTasks.twitter_retweet && (
    <div className={completedTasks.twitter_retweet ? 'task-conatiner bg-ts' : 'task-conatiner'}>
      <div>
        <p>Retweet</p>
        <p className='points-text'>+300</p>
      </div>
      <button onClick={handleRetweet}>
        {isLoadingRetweet ? 'Loading' : (completedTasks.twitter_retweet ? <img className='done-task-img' src="./checkl.svg" alt="" /> : 'Retweet')}
      </button>
    </div>
  )}
        {!completedTasks.twitter_follow_sersilverstone && (
          <div className={completedTasks.twitter_follow_sersilverstone ? 'task-conatiner bg-ts' : 'task-conatiner'}>
            <div>
              <p>Follow on X</p>
              <p className='points-text'>+300</p>
            </div>
            <button onClick={handleFollowSersilverstone}>
              {isLoadingFollowSersilverstone ? 'Loading' : (completedTasks.twitter_follow_sersilverstone ? <img className='done-task-img' src="./checkl.svg" alt="" /> : 'Follow')}
            </button>
          </div>
        )}
        {!completedTasks.input_code_task && (
          <div className={completedTasks.input_code_task ? 'task-conatiner bg-ts' : 'task-conatiner'}>
            <div>
              <p>Enter secret code</p>
              <p className='points-text'>+500</p>
            </div>
            <button disabled={completedTasks.input_code_task} onClick={handleOpenModalCode}>
              {completedTasks.input_code_task ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Enter'}
            </button>
          </div>
        )}


      </section>

      <section className='boost-task'>
        <div className='boost-task-title'>
          <div className='boost-task-title-icon'>
            <img src="coin.svg" alt="" />
            <h3>Tasks</h3>
          </div>
        </div>
        <div className={completedTasks.connect_ton_wallet ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Connect TON Wallet</p>
            <p className='points-text'>+500</p>
          </div>

          {!userFriendlyAddress ? (
            <>
              <button onClick={handleTonWalletConnect}>
                Connect
              </button>
            </>
          ) : (
            <>
              <button onClick={handleTonWalletClaim}>
                {completedTasks.connect_ton_wallet ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Claim'}
              </button>
            </>
          )}

        </div>

        <div className={completedTasks.follow_twitter ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Follow us on X</p>
            <p className='points-text'>+300</p>
          </div>
          <button onClick={handleFollowTwitter}>
            {isLoadingX ? 'Loading' : (completedTasks.follow_twitter ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Follow')}
          </button>
        </div>
        <div className={completedTasks.join_channel ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Join Ann Channel</p>
            <p className='points-text'>+300</p>
          </div>
          <button onClick={handleJoinChannel}>
            {isLoadingAnn ? 'Loading' : (completedTasks.join_channel ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Join')}
          </button>
        </div>
        <div className={completedTasks.join_discord ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Join us on Discord</p>
            <p className='points-text'>+300</p>
          </div>
          <button onClick={handleJoinDiscord}>
            {isLoadingDiscord ? 'Loading' : (completedTasks.join_discord ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Join')}
          </button>
        </div>
        <div className={completedTasks.follow_medium ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Follow us on Medium</p>
            <p className='points-text'>+300</p>
          </div>
          <button onClick={handleFollowMedium}>
            {isLoadingMedium ? 'Loading' : (completedTasks.follow_medium ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Follow')}
          </button>
        </div>
        <div className={completedTasks.follow_warpcast ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Follow us on Warpcast</p>
            <p className='points-text'>+300</p>
          </div>
          <button onClick={handleFollowWarpcast}>
            {isLoadingWarpcast ? 'Loading' : (completedTasks.follow_warpcast ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Follow')}
          </button>
        </div>
        <div className={completedTasks.follow_lens ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Follow us on Lens</p>
            <p className='points-text'>+300</p>
          </div>
          <button onClick={handleFollowLens}>
            {isLoadingLens ? 'Loading' : (completedTasks.follow_lens ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Follow')}
          </button>
        </div>
        <div className={completedTasks.input_EVM_task ? 'task-conatiner bg-ts' : 'task-conatiner'}>
          <div>
            <p>Enter EVM Wallet Address</p>
            <p className='points-text'>+500</p>
          </div>
          <button disabled={completedTasks.input_EVM_task} onClick={handleOpenModal}>
            {completedTasks.input_EVM_task ? <img className='done-task-img' src="./checkl.svg" alt="Completed" /> : 'Enter'}
          </button>
        </div>

        {!completedTasks.invite1friends && (
          <div className='task-conatiner'>
            <div>
              <p>Invite 1 friend</p>
              <p className='points-text'>+400</p>
            </div>
            <button onClick={handle1Friends}>
              {invitedFriends.length} / 1
            </button>
          </div>
        )}

        {completedTasks.invite1friends && !completedTasks.invite3friends && (
          <div className='task-conatiner'>
            <div>
              <p>Invite 3 friend</p>
              <p className='points-text'>+1200</p>
            </div>
            <button onClick={handle3Friends}>
              {invitedFriends.length} / 3
            </button>
          </div>
        )}

        {completedTasks.invite3friends && !completedTasks.invite5friends && (
          <div className='task-conatiner'>
            <div>
              <p>Invite 5 friend</p>
              <p className='points-text'>+2000</p>
            </div>
            <button onClick={handle5Friends}>
              {invitedFriends.length} / 5
            </button>
          </div>
        )}

        {completedTasks.invite5friends && !completedTasks.invite10friends && (
          <div className='task-conatiner'>
            <div>
              <p>Invite 10 friend</p>
              <p className='points-text'>+4000</p>
            </div>
            <button onClick={handle10Friends}>
              {invitedFriends.length} / 10
            </button>
          </div>
        )}



        {isModalOpen && (
          <div className='modal'>
            <div className='modal-content'>
              <p>Enter EVM Wallet Address</p>
              <input
                type='text'
                value={inputText}
                onChange={handleInputChange}
                placeholder='0xAdv23d...'
              />
              <button onClick={handleConfirmTask}>
                {isLoadingManualTask ? 'Saving...' : 'Confirm'}
              </button>
              <button onClick={handleCloseModal}>Cancel</button>
            </div>
          </div>
        )}

        {isModalOpenCode && (
          <div className='modal'>
            <div className='modal-content'>
              <p>Enter secret code</p>
              <input
                type='text'
                value={inputTextCode}
                onChange={handleInputChangeCode}
                placeholder='?????'
              />
              {errorMessage && <p className='error-code'>{errorMessage}</p>}
              <button onClick={handleConfirmTaskCode}>
                {isLoadingManualTask ? 'Saving...' : 'Confirm'}
              </button>
              <button onClick={handleCloseModalCode}>Cancel</button>
            </div>
          </div>
        )}
      </section>


      <br />
      <br />
      <br />
      <br />
      <br />
      <br />

    </section>

    {isNewUser == true && (
      <div className='modal-reward'>
        <div className='modal-content-reward'>

          <h2>Welcome to SomeDAO!</h2>
          <p>We have a gift for you!</p>
          <h3>+1000 $SOME</h3>

          <button onClick={handleNewUserReward}>
            Claim!
          </button>

        </div>
      </div>
    )}

  </>;
}


