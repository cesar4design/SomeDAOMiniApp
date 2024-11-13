"use client"; // Marca el componente como Client Component

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';


import Spinner from './Components/spinner';
import "./page.css";

function HomePage() {
  const router = useRouter();
  const pathname = usePathname();  // Para obtener la ruta actual
  const searchParams = useSearchParams();  // Para obtener los parámetros de búsqueda


  useEffect(() => {
    // Ejemplo de uso de router para redirigir
    if (pathname === '/') {
      router.replace('/Home');
    }
  }, [router, pathname, searchParams]);

  return <div></div>;
}

export default function Page() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase()
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']

    const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword))
    setIsDesktop(!isMobile)
  }, [])

  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Simula una carga de datos
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);


  return (
    <>


      <>
        {!isLoading ? (<>

          <Suspense fallback={<div></div>}>
            <HomePage />
          </Suspense></>) : (<>

            <div className="loading-screen">
              <div className="bg-blur">
                <h1>SomeDAO App </h1>
                <Spinner />
                <p>Loading...</p>

              </div>
            </div>

          </>)
        }
      </>





    </>
  );
}
