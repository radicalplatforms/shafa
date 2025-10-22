import React from "react"
import { Card } from "@/components/ui/card"

interface RatingProps {
  rating: 0 | 1 | 2
}

export default function Rating({ rating }: RatingProps) {
  return (
    <div className="w-[0.9rem]">
      <div className="flex flex-col gap-[2.5px]">
        <div className={`h-[2.5px] w-full rounded-xl ${rating === 2 ? "bg-green-500" : "bg-gray-300"}`} />
        <div className={`h-[2.5px] w-full ml-auto rounded-xl ${rating === 1 ? "bg-gray-500" : "bg-gray-300"}`} />
        <div className={`h-[2.5px] w-full ml-auto rounded-xl ${rating === 0 ? "bg-red-500" : "bg-gray-300"}`} />
      </div>
    </div>
  )
}

