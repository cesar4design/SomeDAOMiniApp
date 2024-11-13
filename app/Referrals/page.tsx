'use client'

import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { doc, onSnapshot, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import "./page.css";

interface UserData {
    id: number;
    username: string;
    profileImg: string;
    newUserPoints: number;
}


export default function Referrals() {


    const [userData, setUserData] = useState<any>(null);
    const [invitationLink, setInvitationLink] = useState<string>('https://t.me/SomeDAO_bot');
    const [invitedFriends, setInvitedFriends] = useState<UserData[]>([]);

    useEffect(() => {
        if (WebApp.initDataUnsafe.user) {
            const user = WebApp.initDataUnsafe.user;
            setUserData(user);

            const userDoc = doc(db, 'users', user.id.toString());

            const unsubscribe = onSnapshot(userDoc, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    setInvitationLink(`https://t.me/SomeDAO_bot?start=${userDoc.id}`);
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
                                newUserPoints: invitedUserData?.newUserPoints || 0,
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


    const copyToClipboard = () => {
        navigator.clipboard.writeText(invitationLink);

        // Abre la ventana de compartir en Telegram
        const telegramShareURL = `https://t.me/share/url?url=${encodeURIComponent(invitationLink)}&text=Join SomeDAO App and start collecting $SOME.
Get +1000 $SOME as a first-time gift. Limited time only!`;
        window.open(telegramShareURL, '_blank');
    };

    const [showMessage, setShowMessage] = useState(false);

    const copylink = () => {
        navigator.clipboard.writeText(invitationLink);
        // Muestra el mensaje y lo oculta después de 10 segundos
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 10000);


    };

    return <>

        <section className='main-section'>

            <section className='top-section-ref'>
                <h2>Invite Friends</h2>
                <img src="coin.svg" alt="" />
                <p>Get DOUBLE rewards for every friend you invite. 2x500 $SOME. 
Limited time only!</p>
            </section>

            <section className='links-container'>
                <button onClick={copyToClipboard}>Invite friend</button>
                <button onClick={copylink}>Copy link</button>
            </section>

            <section className='referral-list'>
                <div className='boost-task-title'>
                    <div className='boost-task-title-icon'>
                        <img src="coin.svg" alt="" />
                        <h3>Your Friends:</h3>
                    </div>
                    <h3 className='friends-text'>{invitedFriends.length}</h3>
                </div>
                <div className='friends-conatiner'>

                    {invitedFriends.length > 0 ? (
                        invitedFriends.map((friend) => (
                            <div className="friend-container" key={friend.id}>
                                <p> {friend.username} </p>
                                <p className='points-text'>{friend.newUserPoints} $pSOME</p>
                            </div>
                        ))
                    ) : (
                        <p className="nofriend-text">No friends invited yet.</p>

                    )}

                   
                </div>
            </section>

            <br /><br /><br /><br />




        </section>







    </>;
}
