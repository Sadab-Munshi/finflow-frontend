'use client'

export default function AuthBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#dce8f0]">
      {/* Soft emerald organic blob shapes at the top */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[70%] h-[50%] opacity-30"
        style={{
          background: 'radial-gradient(ellipse at center, #10b981 0%, transparent 70%)',
          filter: 'blur(80px)',
          borderRadius: '60% 40% 50% 50% / 50% 50% 50% 50%',
        }}
      />
      <div
        className="absolute -top-[10%] left-[30%] w-[50%] h-[40%] opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, #34d399 0%, transparent 70%)',
          filter: 'blur(60px)',
          borderRadius: '40% 60% 60% 40% / 60% 40% 60% 40%',
        }}
      />
      <div
        className="absolute -top-[5%] right-[10%] w-[40%] h-[35%] opacity-25"
        style={{
          background: 'radial-gradient(ellipse at center, #059669 0%, transparent 70%)',
          filter: 'blur(70px)',
          borderRadius: '50% 50% 40% 60% / 40% 60% 50% 50%',
        }}
      />
    </div>
  )
}
