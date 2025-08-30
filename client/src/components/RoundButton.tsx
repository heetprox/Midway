"use client"

import Link from 'next/link'
import React, { useState } from 'react'

const RoundButton = ({ text1, text2, link, className }: { text1: string, text2: string, link: string, className?: string }) => {

    const [isHovered, setIsHovered] = useState(false);
    return (
        <div className="aspect-square relative w-[40vw] md:w-[12vw]">
            <div className={`absolute 
                        border-2 border-[#181917]
                        aspect-square top-0 left-0 w-full h-full bg-[#181917]/10 rounded-full translate-7`}>

                        </div>
            <div className={`rounded-full w-full aspect-square relative cursor-pointer  flex flex-col ${isHovered ? "translate-3 transition-all duration-300" : "translate-0 transition-all duration-300"}  justify-center  items-center b-font bg-[#181917] text-[#FEFBEC]`}
            style={{
                rotate: `${className}deg`,
            }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* <div className={`absolute aspect-square top-0 left-0 w-full h-full bg-[#181917]/30 rounded-full  ${isHovered ? "translate-3 transition-all duration-500" : "translate-0 transition-all duration-500"}`}></div> */}
                {/* <div className={`absolute aspect-square top-0 left-0 w-full h-full bg-[#181917]/20 rounded-full  ${isHovered ? "translate-6 transition-all duration-500" : "translate-0 transition-all duration-500"}`}></div> */}


                <Link href={link}
                    style={{
                        fontSize: "clamp(1.25rem, 2vw, 200rem)",
                        lineHeight: "clamp(1.25rem, 2.25vw, 200rem)",
                        zIndex: 20
                    }}
                >
                    <p className='w-full text-center '>{text1}</p>
                    <p className='w-full text-center '>{text2}</p>
                </Link>
            </div>
        </div>
    )
}

export default RoundButton
