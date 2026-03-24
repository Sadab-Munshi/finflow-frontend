import Image from 'next/image'

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Image src="/assets/loading.gif" alt="Loading..." width={64} height={64} unoptimized />
    </div>
  )
}
