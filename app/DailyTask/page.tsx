'use client'

import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { doc, onSnapshot, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import "./page.css";

interface ClickEffect {
  id: number;
  x: number;
  y: number;
}

export default function Tasks() {

  /////////////////// Recompensas diarias ////////////////////
  const DailyRewards: { [key: number]: number } = {
    1: 50,
    2: 100,
    3: 150,
    4: 200,
    5: 250,
    6: 300,
    7: 350,
    8: 400,
    9: 450,
    10: 500,
  };

  const [userData, setUserData] = useState<any>(null);
  const [lastClaimDay, setLastClaimDay] = useState<number>(0); // El último día que reclamó
  const [lastClaimTimestamp, setLastClaimTimestamp] = useState<Date | null>(null); // Timestamp del último reclamo
  const [currentDay, setCurrentDay] = useState<number>(1); // Día actual desbloqueado
  const [canClaim, setCanClaim] = useState<boolean>(true); // Si puede reclamar o no
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (WebApp.initDataUnsafe.user) {
      const user = WebApp.initDataUnsafe.user;
      setUserData(user);

      const userDoc = doc(db, 'users', user.id.toString());

      const unsubscribe = onSnapshot(userDoc, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setLastClaimDay(data.lastClaimDay || 0);
          setCompletedTasks(data.completedTasks || {});
          setLastClaimTimestamp(data.lastDailyClaim ? data.lastDailyClaim.toDate() : null);
          handleClaimAvailability(data.lastDailyClaim ? data.lastDailyClaim.toDate() : null);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  // Función para manejar la disponibilidad de reclamos
  const handleClaimAvailability = (lastDailyClaim: Date | null) => {
    if (!lastDailyClaim) {
      setCanClaim(true);
      return;
    }
  
    const now = new Date();
    const nextClaim = new Date(lastDailyClaim.getTime() + 24 * 60 * 60 * 1000); // Próximo reclamo en 24 horas
  
    // Si han pasado más de 24 horas
    if (now >= nextClaim) {
      const diffInDays = Math.floor((now.getTime() - lastDailyClaim.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays > 1) {
        // Reiniciar progreso si han pasado más de 24 horas sin reclamar
        setCurrentDay(1);
        setLastClaimDay(0);
        setCanClaim(true);
        
        // Actualizar el documento del usuario para reflejar el reinicio
        resetUserProgress();
      } else {
        setCanClaim(true); // Puede reclamar
        setCurrentDay(lastClaimDay + 1); // Desbloquea el siguiente día
      }
    } else {
      setCanClaim(false); // No puede reclamar todavía
    }
  };

  const resetUserProgress = async () => {
    if (!userData) return;
  
    const userDocRef = doc(db, 'users', userData.id.toString());
    try {
      await updateDoc(userDocRef, {
        lastClaimDay: 0,
        lastDailyClaim: null,
      });
  
      // Actualiza el estado localmente
      setLastClaimDay(0);
      setLastClaimTimestamp(null);
    } catch (error) {
      console.error('Error al reiniciar el progreso del usuario:', error);
    }
  };

  const [clicked, setClicked] = useState<boolean>(false); // Estado para gestionar la animación de la moneda
  const [clickEffects, setClickEffects] = useState<ClickEffect[]>([]); // Manejo de múltiples clics

  const handleTapAndClaim = async (e: React.MouseEvent, day: number) => {
    // Primero intentamos hacer el claim de la recompensa diaria
    const claimSuccess = await claimReward(day);

    // Si el claim fue exitoso, activamos la animación
    if (claimSuccess) {
      setClicked(true); // Activar animación de escala

      // Agregar un nuevo efecto de clic con una posición única
      const newEffect: ClickEffect = {
        id: Date.now(), // Usamos un ID único basado en la marca de tiempo
        x: e.clientX,
        y: e.clientY,
      };
      setClickEffects((prev) => [...prev, newEffect]);

      // Restablecer animación de la moneda después de un corto período
      setTimeout(() => {
        setClicked(false);
      }, 200); // Duración del efecto

      // Eliminar el efecto de clic después de la animación
      setTimeout(() => {
        setClickEffects((prev) => prev.filter((effect) => effect.id !== newEffect.id));
      }, 1000); // Eliminar después de 1 segundo
    }
  };

  // Función para reclamar la recompensa diaria
  const claimReward = async (day: number): Promise<boolean> => {
    if (!userData || !canClaim) return false;

    const reward = DailyRewards[day];
    const userDocRef = doc(db, 'users', userData.id.toString());
    const now = new Date();

    try {
      // Actualiza los datos del usuario en la base de datos
      await updateDoc(userDocRef, {
        points: (await getDoc(userDocRef)).data()?.points + reward,
        lastDailyClaim: Timestamp.fromDate(now),
        lastClaimDay: day,
      });

      // Actualiza el estado localmente
      setLastClaimDay(day);
      setLastClaimTimestamp(now);
      setCanClaim(false);
      handleClaimAvailability(now);

      return true; // Claim exitoso
    } catch (error) {
      console.error('Error al reclamar la recompensa:', error);
      return false; // Claim fallido
    }
  };

  return <>
    <section className='main-section'>
      <section className='top-section-daily'>
        <h2>Daily Rewards</h2>
        <p>Collect the daily login bonus and stack more $SOME!</p>
      </section>


      <div className="dayly-rewards-gui">
        <div className="daily-rewards-container">
          {Object.keys(DailyRewards).map(threshold => {
            const DayThreshold = Number(threshold);
            const DayPoints = DailyRewards[DayThreshold];
            const isClaimed = DayThreshold <= lastClaimDay; // Si ya fue reclamado
            const isNextDay = DayThreshold === lastClaimDay + 1; // Si es el siguiente día disponible

            return (
              <div className="task-container" key={DayThreshold}>
                <div onClick={(e) => isNextDay && canClaim && handleTapAndClaim(e, DayThreshold)}>
                  <div className={`day-container ${isClaimed ? 'claimed' : ''} ${(canClaim && isNextDay && !isClaimed) ? 'active' : ''}`}>
                    <p className='day-text'>Day {DayThreshold}</p>
                    <p className='point-text'>+{DayPoints}</p>
                    <p className='point-text'>$pSOME</p>
                    {isClaimed && (
                      <>
                        <img className='check-img' src="./check.svg" alt="Check" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>


      </div>

      <br /><br /><br /><br /><br />

    </section>









  </>;
}
