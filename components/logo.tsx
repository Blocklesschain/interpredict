import Image from "next/image"

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/images/interpredict-icon.png"
      alt="InterPredict logo"
      width={64}
      height={64}
      priority
      className={className}
    />
  )
}
