'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

interface ParticleSphereProps {
  isRecording: boolean
  isProcessing?: boolean
  hasError?: boolean
  onTap: () => void
}

function GlobeMesh({
  isRecording,
  isProcessing,
  hasError,
}: {
  isRecording: boolean
  isProcessing: boolean
  hasError: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const errorTimeRef = useRef<number | null>(null)
  const scaleRef = useRef(1)

  const gradientTexture = useMemo(() => {
    if (typeof window === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Diagonal gradient: white → light teal → teal → purple
    const grad = ctx.createLinearGradient(0, 0, 512, 512)
    grad.addColorStop(0, '#f0fdf4')
    grad.addColorStop(0.2, '#ccfbf1')
    grad.addColorStop(0.5, '#14b8a6')
    grad.addColorStop(0.8, '#7c3aed')
    grad.addColorStop(1, '#4c1d95')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 512)

    // Soft white highlight near top-left for depth illusion
    ctx.globalAlpha = 0.55
    const highlight = ctx.createRadialGradient(170, 140, 0, 170, 140, 220)
    highlight.addColorStop(0, 'rgba(255,255,255,0.9)')
    highlight.addColorStop(1, 'transparent')
    ctx.fillStyle = highlight
    ctx.fillRect(0, 0, 512, 512)
    ctx.globalAlpha = 1

    return new THREE.CanvasTexture(canvas)
  }, [])

  useEffect(() => {
    if (hasError) {
      errorTimeRef.current = performance.now()
    }
  }, [hasError])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    // Continuous rotation — faster when processing
    meshRef.current.rotation.y += isProcessing ? 0.014 : isRecording ? 0.006 : 0.003
    meshRef.current.rotation.x = Math.sin(t * 0.4) * 0.05

    // Scale: breathe/pulse when recording
    const targetScale = isRecording ? 1.1 + Math.sin(t * 2.5) * 0.055 : 1.0
    scaleRef.current += (targetScale - scaleRef.current) * 0.08
    meshRef.current.scale.setScalar(scaleRef.current)

    // Error shake: brief horizontal oscillation (~0.5 s)
    if (errorTimeRef.current !== null) {
      const elapsed = (performance.now() - errorTimeRef.current) / 1000
      if (elapsed < 0.5) {
        meshRef.current.position.x =
          Math.sin(elapsed * 60) * 0.08 * Math.max(0, 1 - elapsed * 2)
      } else {
        meshRef.current.position.x = 0
        errorTimeRef.current = null
      }
    }
  })

  if (!gradientTexture) return null

  return (
    <>
      {/* Main globe */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshDistortMaterial
          map={gradientTexture}
          distort={isRecording ? 0.35 : 0.18}
          speed={isRecording ? 2.5 : 1.2}
          roughness={0.15}
          metalness={0.08}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Outer halo */}
      <mesh scale={1.18}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color={isRecording ? '#14b8a6' : '#8b5cf6'}
          transparent
          opacity={isRecording ? 0.07 : 0.03}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

export default function ParticleSphere({
  isRecording,
  isProcessing = false,
  hasError = false,
  onTap,
}: ParticleSphereProps) {
  return (
    <div
      onClick={onTap}
      style={{
        width: 240,
        height: 240,
        cursor: 'pointer',
        position: 'relative',
        margin: '0 auto',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ width: '240px', height: '240px' }}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[4, 4, 4]} intensity={1.0} color="#ffffff" />
        <pointLight position={[-3, -2, 2]} intensity={0.5} color="#0d9488" />
        <GlobeMesh
          isRecording={isRecording}
          isProcessing={isProcessing}
          hasError={hasError}
        />
      </Canvas>

      {/* CSS glow ring — no Three.js needed */}
      <div
        style={{
          position: 'absolute',
          inset: '-12px',
          borderRadius: '50%',
          boxShadow: isRecording
            ? '0 0 55px 18px rgba(20,184,166,0.28)'
            : '0 0 30px 8px rgba(139,92,246,0.12)',
          pointerEvents: 'none',
          transition: 'box-shadow 0.5s ease',
        }}
      />
    </div>
  )
}
