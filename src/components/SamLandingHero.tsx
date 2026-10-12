"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Database, Terminal, ShieldAlert, Cpu } from "lucide-react";
import Link from "next/link";

import type { Variants } from "framer-motion";

interface SamLandingHeroProps {
  onGetStarted: () => void;
}

export function SamLandingHero({ onGetStarted }: SamLandingHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse: { x: number | null; y: number | null; radius: number } = {
      x: null,
      y: null,
      radius: 180,
    };

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor(
        x: number,
        y: number,
        directionX: number,
        directionY: number,
        size: number,
        color: string
      ) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      update() {
        if (!canvas) return;
        if (this.x > canvas.width || this.x < 0) {
          this.directionX = -this.directionX;
        }
        if (this.y > canvas.height || this.y < 0) {
          this.directionY = -this.directionY;
        }

        // Mouse collision / repulsion
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius + this.size) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= forceDirectionX * force * 4.5;
            this.y -= forceDirectionY * force * 4.5;
          }
        }

        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    function init() {
      if (!canvas) return;
      particles = [];
      const numberOfParticles = Math.min(110, Math.floor((canvas.height * canvas.width) / 10000));
      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 2 + 1;
        const x = Math.random() * (canvas.width - size * 4) + size * 2;
        const y = Math.random() * (canvas.height - size * 4) + size * 2;
        const directionX = Math.random() * 0.4 - 0.2;
        const directionY = Math.random() * 0.4 - 0.2;
        // Phosphor green & amber data particles
        const isAmber = Math.random() > 0.85;
        const color = isAmber ? "rgba(255, 176, 0, 0.85)" : "rgba(51, 255, 0, 0.85)";
        particles.push(new Particle(x, y, directionX, directionY, size, color));
      }
    }

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const connect = () => {
      if (!ctx || !canvas) return;
      const maxDistance = (canvas.width / 8) * (canvas.height / 8);

      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distance = dx * dx + dy * dy;

          if (distance < maxDistance && distance < 22000) {
            const opacity = 1 - distance / 22000;

            let strokeColor = `rgba(31, 82, 31, ${opacity * 0.5})`; // Muted dark green
            if (mouse.x !== null && mouse.y !== null) {
              const dxMouse = particles[a].x - mouse.x;
              const dyMouse = particles[a].y - mouse.y;
              const mouseDist = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
              if (mouseDist < mouse.radius) {
                strokeColor = `rgba(51, 255, 0, ${opacity * 0.9})`; // Bright phosphor green when near cursor
              }
            }

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      animationFrameId = requestAnimationFrame(animate);

      // Deep terminal black background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      connect();
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);

    init();
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.12 + 0.1,
        duration: 0.6,
        ease: "easeOut",
      },
    }),
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a] text-[#33ff00] font-mono flex flex-col justify-between select-none">
      {/* ── Interactive Particle Mesh Background ──────────────────────── */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-auto" />

      {/* ── CRT Scanline & Phosphor Grid Overlay ───────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-terminal-scanlines opacity-50" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-terminal-grid opacity-30" />

      {/* ── Top Status Banner ─────────────────────────────────────────── */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-[#1f521f] bg-[#0d100d]/85 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-[#33ff00] shadow-[0_0_6px_#33ff00]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#33ff00]">
            SAMDB ENGINE v1.0.0
          </span>
          <span className="text-[#1f521f]">|</span>
          <span className="hidden sm:inline font-mono text-xs text-[#8dcf7a]">
            SYSTEMS, ARCHITECTURE &amp; MEMORY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/about-project"
            className="border border-[#1f521f] bg-[#0a0a0a] px-3 py-1 font-mono text-xs text-[#8dcf7a] hover:border-[#33ff00] hover:text-[#33ff00] transition-colors"
          >
            [ THE BUILD ]
          </Link>
          <Link
            href="/about"
            className="border border-[#1f521f] bg-[#0a0a0a] px-3 py-1 font-mono text-xs text-[#8dcf7a] hover:border-[#33ff00] hover:text-[#33ff00] transition-colors"
          >
            [ ABOUT ]
          </Link>
        </div>
      </header>

      {/* ── Central Hero Content (No Scrolling, Clean Fit) ─────────────── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Top Pill / Badge */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 border border-[#1f521f] bg-[#0d100d]/90 px-3.5 py-1.5 font-mono text-xs mb-4 shadow-[0_0_10px_rgba(51,255,0,0.1)]"
          >
            <Zap className="h-3.5 w-3.5 text-[#33ff00] animate-pulse" />
            <span className="text-[#c8ffb0] font-semibold tracking-wider uppercase">
              EDUCATIONAL SQL DATABASE ENGINE &amp; ENGINEERING WORKBENCH
            </span>
          </motion.div>

          {/* Main Title: SAM Database */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight font-mono text-[#33ff00] mb-2"
            style={{ textShadow: "0 0 20px rgba(51,255,0,0.5), 0 0 40px rgba(51,255,0,0.2)" }}
          >
            SAM <span className="text-[#ffb000]">DATABASE</span>
          </motion.h1>

          {/* Subheading / Tagline */}
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-mono text-sm sm:text-base text-[#c8ffb0] font-medium max-w-2xl mb-4 leading-relaxed"
          >
            &quot;Understand what happens between a SQL statement and the data it returns.&quot;
          </motion.p>

          {/* Brief project description for newcomers */}
          <motion.p
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-mono text-xs sm:text-sm text-[#8dcf7a]/90 max-w-2xl mb-6 leading-relaxed bg-[#0a0a0a]/75 border border-[#1f521f] p-3 backdrop-blur-sm"
          >
            A real, inspectable database engine built from zero in TypeScript. Watch your SQL parse into an AST, see the query planner decide between an index scan vs. a sequential table scan, observe the B+Tree nodes traverse in real-time, and simulate crash recovery with the Write-Ahead Log. Zero mocks.
          </motion.p>

          {/* 4 Core Pillars Grid */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-3xl mb-8"
          >
            <FeatureCard
              icon={<Terminal className="h-4 w-4 text-[#33ff00]" />}
              title="PARSER & PLANNER"
              desc="Recursive descent AST with rule-based optimizer"
            />
            <FeatureCard
              icon={<Database className="h-4 w-4 text-[#a78bfa]" />}
              title="B+TREE INDEX"
              desc="4KB slotted pages, live splits & search traversal"
            />
            <FeatureCard
              icon={<Cpu className="h-4 w-4 text-[#ffb000]" />}
              title="STORAGE PAGER"
              desc="Slotted row heap with dirty pages & I/O counters"
            />
            <FeatureCard
              icon={<ShieldAlert className="h-4 w-4 text-[#ff3333]" />}
              title="WAL RECOVERY"
              desc="Append-only redo log with crash & replay lab"
            />
          </motion.div>

          {/* Primary CTA Button: Get Started */}
          <motion.div
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <button
              onClick={onGetStarted}
              className="cursor-pointer border-2 border-[#33ff00] bg-[#0a110a] px-8 py-3.5 font-mono text-sm sm:text-base font-bold text-[#33ff00]
                         transition-all duration-150 shadow-[0_0_15px_rgba(51,255,0,0.3)]
                         hover:bg-[#33ff00] hover:text-[#0a0a0a] hover:shadow-[0_0_25px_rgba(51,255,0,0.6)]
                         flex items-center gap-2.5"
            >
              [ GET STARTED &rarr; LAUNCH WORKBENCH ]
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </main>

      {/* ── Bottom Status Bar ─────────────────────────────────────────── */}
      <footer className="relative z-10 flex shrink-0 items-center justify-between border-t border-[#1f521f] bg-[#0d100d]/90 px-4 py-2 font-mono text-xs text-[#4a7a40]">
        <span>
          samdb@workspace:~$ <span className="text-[#33ff00]">ready for interactive query execution</span>
        </span>
        <span className="hidden sm:inline text-[#8dcf7a]">
          NO EXTERNAL DB &bull; IN-MEMORY + WAL &bull; FAST-CHECK VERIFIED
        </span>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="border border-[#1f521f] bg-[#0a0a0a]/90 p-2.5 text-left backdrop-blur-sm hover:border-[#33ff00] transition-colors">
      <div className="flex items-center gap-1.5 mb-1 font-mono text-xs font-bold text-[#c8ffb0]">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      <p className="font-mono text-xs text-[#8dcf7a]/75 leading-tight">{desc}</p>
    </div>
  );
}
