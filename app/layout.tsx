'use client'

import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import Navbar from "./Components/Navbar";
import { useEffect } from "react";
import WebApp from '@twa-dev/sdk';

import { THEME, TonConnectUIProvider } from "@tonconnect/ui-react";


export default function RootLayout(
  {
    children,
  }: {
    children: React.ReactNode;
  }) {

  useEffect(() => {
    WebApp.ready(); // Asegura que el SDK esté listo
    WebApp.expand(); // Expande la mini app a pantalla completa
  }, []);

  const manifestUrl = 'https://firebasestorage.googleapis.com/v0/b/someappbot-6857c.appspot.com/o/manifest.json?alt=media&token=28d87a6b-c6d2-4f53-b89e-9255ad044bb7';


  return (
    <>

      <TonConnectUIProvider
        manifestUrl="https://some-app-two.vercel.app/manifest.json"
        uiPreferences={{ theme: THEME.DARK }}
        walletsListConfiguration={{
          includeWallets: [
            {
              appName: "tonwallet",
              name: "TON Wallet",
              imageUrl: "https://wallet.ton.org/assets/ui/qr-logo.png",
              aboutUrl: "https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd",
              universalLink: "https://wallet.ton.org/ton-connect",
              jsBridgeKey: "tonwallet",
              bridgeUrl: "https://bridge.tonapi.io/bridge",
              platforms: ["chrome", "android"]
            },
            {
              appName: "nicegramWallet",
              name: "Nicegram Wallet",
              imageUrl: "https://static.nicegram.app/icon.png",
              aboutUrl: "https://nicegram.app",
              universalLink: "https://nicegram.app/tc",
              deepLink: "nicegram-tc://",
              jsBridgeKey: "nicegramWallet",
              bridgeUrl: "https://bridge.tonapi.io/bridge",
              platforms: ["ios", "android"]
            },
            {
              appName: "fintopio-tg",
              name: "Fintopio Telegram",
              imageUrl: "https://fintopio.com/tonconnect-icon.png",
              aboutUrl: "https://fintopio.com",
              universalLink: "https://t.me/fintopio?attach=wallet",
              bridgeUrl: "https://wallet-bridge.fintopio.com/bridge",
              platforms: ["ios", "android", "macos", "windows", "linux"]
            },
            {
              appName: "tokenpocket",
              name: "TokenPocket",
              imageUrl: "https://hk.tpstatic.net/logo/tokenpocket.png",
              aboutUrl: "https://tokenpocket.pro",
              jsBridgeKey: "tokenpocket",
              platforms: ["ios", "android"]
            },
            {
              appName: "dewallet",
              name: "DeWallet",
              imageUrl: "https://raw.githubusercontent.com/delab-team/manifests-images/main/WalletAvatar.png",
              aboutUrl: "https://delabwallet.com",
              universalLink: "https://t.me/dewallet?attach=wallet",
              bridgeUrl: "https://bridge.dewallet.pro/bridge",
              platforms: ["ios", "android", "macos", "windows", "linux"]
            },
            {
              appName: "BitgetWeb3",
              name: "BitgetWeb3",
              imageUrl: "https://img.bitgetimg.com/image/third/1723701408284.png",
              aboutUrl: "https://www.bitget.com",
              universalLink: "https://t.me/BitgetOfficialBot?attach=wallet",
              bridgeUrl: "https://ton-connect-bridge.bgwapi.io/bridge",
              platforms: ["ios", "android", "windows", "macos", "linux"]
            },
            {
              appName: "cdcTonWallet",
              name: "Crypto.com DeFi Wallet",
              imageUrl: "https://apro-ncw-api-file.crypto.com/wallet/logo",
              aboutUrl: "https://crypto.com/defi-wallet",
              universalLink: "https://wallet.crypto.com/deeplink/ton-connect",
              deepLink: "dfw://",
              jsBridgeKey: "cdcTonWallet",
              bridgeUrl: "https://wallet.crypto.com/sse/tonbridge",
              platforms: ["ios", "android", "chrome"]
            },
            {
              appName: "tobi",
              name: "Tobi",
              imageUrl: "https://app.tobiwallet.app/icons/logo.png",
              aboutUrl: "https://tobi.fun",
              universalLink: "https://t.me/TobiWalletBot?attach=wallet",
              bridgeUrl: "https://bridge.tonapi.io/bridge",
              platforms: ["ios", "android", "macos", "windows", "linux"]
            },
            {
              appName: "trustwalletTon",
              name: "Trust",
              imageUrl: "https://assets-cdn.trustwallet.com/dapps/trust.logo.png",
              aboutUrl: "https://trustwallet.com/about-us",
              bridgeUrl: "https://tonconnect.trustwallet.com/",
              jsBridgeKey: "trustwalletTon",
              platforms: ["chrome", "ios", "android"]
            }
          ]
        }}
        actionsConfiguration={{
          twaReturnUrl: 'https://t.me/DemoDappWithTonConnectBot/demo'
        }}
      >

        <html lang="en" suppressHydrationWarning={true}>
          <head>
            {/* Meta tag para deshabilitar el zoom en móviles */}
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
            <meta charSet="UTF-8" />
            <link rel="icon" href="./logo.png" />

            <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />

          </head>
          <body suppressHydrationWarning={true}>
            {/* Deshabilitar zoom con gestos táctiles pero permitir scroll */}
            <Script id="disable-zoom">
              {`
            document.addEventListener('touchstart', function(event) {
              if (event.touches.length > 1) {
                event.preventDefault(); // Prevenir pinch-to-zoom
              }
            }, { passive: false });
          `}
            </Script>

            <Navbar />

            {children}

          </body>
        </html>

      </TonConnectUIProvider>
    </>
  );
}
