import './globals.css';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'Open Study · Courseware',description:'A quiet workspace for serious study. Original MIT OpenCourseWare, thoughtfully sequenced.',manifest:'/manifest.webmanifest'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;}
