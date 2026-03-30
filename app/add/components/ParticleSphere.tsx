'use client'

import { useRef, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 600
const SPHERE_RADIUS = 2.2
const TEAL_COLOR = new THREE.Color('#00b894')
const WHITE_COLOR = new THREE.Color('#ffffff')
const GREEN_ACCENT = new THREE.Color('#55efc4')
const BG_GRADIENT = 'radial-gradient(circle, #0d1f1a 0%, #0a0a0a 100%)'

interface ParticleSphereProps {
  isRecording: boolean
  onTap: () => void
}

function Particles({ isRecording }: { isRecording: boolean }) {
  const meshRef = useRef<THREE.Points>(null)
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const { viewport } = useThree()

  const { positions, basePositions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const base = new Float32Array(PARTICLE_COUNT * 3)
    const col = new Float32Array(PARTICLE_COUNT * 3)
    const sz = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute on sphere surface using fibonacci sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / PARTICLE_COUNT)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const r = SPHERE_RADIUS * (0.85 + Math.random() * 0.3)

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      base[i * 3] = x
      base[i * 3 + 1] = y
      base[i * 3 + 2] = z

      // Random color between teal, white and green accent
      const t = Math.random()
      const color = t < 0.5
        ? TEAL_COLOR.clone().lerp(WHITE_COLOR, Math.random() * 0.4)
        : GREEN_ACCENT.clone().lerp(TEAL_COLOR, Math.random() * 0.6)

      col[i * 3] = color.r
      col[i * 3 + 1] = color.g
      col[i * 3 + 2] = color.b

      sz[i] = 2 + Math.random() * 3
    }

    return { positions: pos, basePositions: base, colors: col, sizes: sz }
  }, [])

  const handlePointerMove = useCallback((e: { clientX: number; clientY: number }) => {
    mouseRef.current.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
    )
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const time = clock.getElapsedTime()
    const geo = meshRef.current.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const sizeAttr = geo.getAttribute('size') as THREE.BufferAttribute

    const recordingIntensity = isRecording ? 1.0 : 0.0
    const pulse = isRecording
      ? 1 + Math.sin(time * 3) * 0.15 + Math.sin(time * 7) * 0.08
      : 1 + Math.sin(time * 0.8) * 0.03

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const bx = basePositions[i * 3]
      const by = basePositions[i * 3 + 1]
      const bz = basePositions[i * 3 + 2]

      // Gentle float
      const floatOffset = Math.sin(time * 0.5 + i * 0.1) * 0.05
      // Recording: vigorous wave
      const waveOffset = isRecording
        ? Math.sin(time * 4 + i * 0.3) * 0.25 + Math.cos(time * 3 + i * 0.2) * 0.15
        : 0

      // Mouse repulsion (simplified)
      const mx = mouseRef.current.x * viewport.width * 0.5
      const my = mouseRef.current.y * viewport.height * 0.5
      const dx = bx * pulse - mx
      const dy = by * pulse - my
      const dist = Math.sqrt(dx * dx + dy * dy)
      const repulsion = dist < 2 ? (2 - dist) * 0.3 : 0

      posAttr.setXYZ(
        i,
        bx * pulse + (dx / (dist || 1)) * repulsion + floatOffset + waveOffset,
        by * pulse + (dy / (dist || 1)) * repulsion + floatOffset + waveOffset * 0.5,
        bz * pulse + floatOffset * 0.5 + waveOffset * 0.3,
      )

      // Pulsing sizes when recording
      const baseSize = sizes[i]
      sizeAttr.setX(
        i,
        baseSize * (1 + recordingIntensity * Math.sin(time * 5 + i) * 0.5),
      )
    }

    posAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    meshRef.current.rotation.y = time * (isRecording ? 0.3 : 0.1)
  })

  // Listen for pointer moves on window
  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [handlePointerMove])

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={3}
        sizeAttenuation
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

export default function ParticleSphere({ isRecording, onTap }: ParticleSphereProps) {
  return (
    <div
      onClick={onTap}
      style={{
        width: '100%',
        height: 280,
        cursor: 'pointer',
        borderRadius: 20,
        overflow: 'hidden',
        background: BG_GRADIENT,
        position: 'relative',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        style={{ touchAction: 'none' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#00b894" />
        <Particles isRecording={isRecording} />
      </Canvas>
      {/* Center glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isRecording ? 120 : 80,
          height: isRecording ? 120 : 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${isRecording ? 'rgba(0,184,148,0.25)' : 'rgba(0,184,148,0.1)'} 0%, transparent 70%)`,
          transition: 'all 0.5s ease',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
