'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation'
import { Rank, Profile2User, Information, MenuBoard } from 'iconsax-react';
import './Navbar.css';

export default function Navbar() {

    const pathname = usePathname()

    return (
        <nav className="navbar">
            <div className='navbar-links'>
                <Link href="/Home" className={`navbar-link ${pathname === '/Home' ? 'active' : ''}`}>
                    <img  className={`${pathname === '/Home' ? 'active' : 'noactive'}`}  src="./home.svg" alt="" />
                </Link>
                <Link href="/DailyTask" className={`navbar-link ${pathname === '/DailyTask' ? 'active' : ''}`}>
                    <img className={`${pathname === '/DailyTask' ? 'active' : 'noactive'}`} src="./tasks.svg" alt="" />
                </Link>
                <Link href="/Referrals" className={`navbar-link ${pathname === '/Referrals' ? 'active' : ''}`}>
                    <img className={`${pathname === '/Referrals' ? 'active' : 'noactive'}`} src="./referrals.svg" alt="" />
                </Link>
                <Link href="/Soon" className={`navbar-link ${pathname === '/Soon' ? 'active' : ''}`}>
                    <img className={`${pathname === '/Soon' ? 'active' : 'noactive'}`} src="./soon.svg" alt="" />
                </Link>
            </div>
        </nav>
    );
}
