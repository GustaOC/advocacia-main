"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Olá! Gostaria de agendar uma consulta jurídica.");
    window.open(`https://wa.me/5567996449627?text=${message}`, "_blank");
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#E3E0D7] text-[#000000] font-sans selection:bg-[#95A08A] selection:text-white">
      {/* 1. HEADER */}
      <header 
        className={`fixed top-0 w-full z-50 transition-colors duration-700 ease-in-out ${scrolled ? "bg-[#E3E0D7] text-[#000000] border-b border-[#A8ABA2]/20" : "bg-transparent text-[#3C443D]"}`}
      >
        <div className="container mx-auto px-6 md:px-12 lg:px-24 h-[80px] flex justify-center items-center relative">
          <nav className="hidden lg:flex space-x-10 items-center text-sm font-medium tracking-wide">
            <Link href="#atuacao" className="hover:text-[#95A08A] transition-colors">Atuação</Link>
            <Link href="#metodo" className="hover:text-[#95A08A] transition-colors">Método</Link>
            <Link href="#perfil" className="hover:text-[#95A08A] transition-colors">Perfil</Link>
            <Link href="#analises" className="hover:text-[#95A08A] transition-colors">Análises</Link>
            <Link href="#contato" className="hover:text-[#95A08A] transition-colors">Contato</Link>
          </nav>

          <button 
            className="lg:hidden absolute right-6 z-50 focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className={`block w-6 h-px mb-1.5 bg-current transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`}></span>
            <span className={`block w-6 h-px mb-1.5 bg-current transition-opacity ${menuOpen ? "opacity-0" : "opacity-100"}`}></span>
            <span className={`block w-6 h-px bg-current transition-transform ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}></span>
          </button>
        </div>

        {/* MOBILE MENU */}
        <div className={`fixed inset-0 bg-[#3C443D] text-[#E3E0D7] z-40 flex flex-col justify-center px-6 transition-transform duration-700 ease-in-out ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>
          <nav className="flex flex-col space-y-8 text-2xl font-serif">
            <Link href="#atuacao" onClick={() => setMenuOpen(false)}>Atuação</Link>
            <Link href="#metodo" onClick={() => setMenuOpen(false)}>Método</Link>
            <Link href="#perfil" onClick={() => setMenuOpen(false)}>Perfil</Link>
            <Link href="#analises" onClick={() => setMenuOpen(false)}>Análises</Link>
            <Link href="#contato" onClick={() => setMenuOpen(false)}>Contato</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* 2. HERO */}
        <section className="relative w-full min-h-[90vh] flex flex-col lg:flex-row bg-[#3C443D] overflow-hidden">
          {/* Lado Esquerdo - 55% */}
          <div className="w-full lg:w-[55%] flex flex-col items-start justify-center text-left px-6 md:px-12 lg:px-24 pt-32 pb-16 lg:py-0 z-10">
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-xl flex flex-col items-start">
              <motion.span variants={fadeInUp} className="text-[#95A08A] text-[11px] md:text-[13px] tracking-[0.2em] uppercase font-semibold mb-6 block">
                Advocacia Estratégica
              </motion.span>
              <motion.h1 variants={fadeInUp} className="font-serif text-white text-[42px] md:text-[50px] lg:text-[64px] leading-[1.05] mb-8">
                Técnica e confiança<br />que permanecem.
              </motion.h1>
              <motion.p variants={fadeInUp} className="text-[#E3E0D7] text-base md:text-lg leading-[1.6] mb-12 font-light max-w-md">
                Advocacia estratégica em Direito Privado e contencioso de maior complexidade, com análise individualizada, precisão processual e acompanhamento pessoal.
              </motion.p>
              <motion.button 
                variants={fadeInUp}
                onClick={handleWhatsApp}
                className="inline-flex items-center justify-center bg-transparent border border-[#A8ABA2] text-[#E3E0D7] hover:bg-[#E3E0D7] hover:text-[#3C443D] px-7 py-3.5 text-sm font-medium transition-colors duration-300 rounded"
              >
                Entrar em contato <span className="ml-2">→</span>
              </motion.button>
            </motion.div>
          </div>
          
          {/* Lado Direito - 45% Foto */}
          <div className="w-full lg:w-[45%] h-[60vh] lg:h-auto relative bg-[#E3E0D7]">
            <Image 
              src="/perfil.png" 
              alt="Dr. Cássio Miguel" 
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>
        </section>

        {/* 3. FORMA DE ATUAÇÃO */}
        <section id="atuacao" className="py-24 md:py-32 lg:py-40 bg-[#E3E0D7]">
          <div className="container mx-auto px-6 md:px-12 lg:px-24">
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
              className="max-w-4xl"
            >
              <motion.span variants={fadeInUp} className="text-[#A8ABA2] text-[11px] md:text-[13px] tracking-[0.2em] uppercase font-semibold mb-6 block">
                Nossa forma de atuar
              </motion.span>
              <motion.h2 variants={fadeInUp} className="font-serif text-[#000000] text-3xl md:text-5xl leading-[1.1] mb-10">
                Cada caso exige uma<br />estratégia própria.
              </motion.h2>
              <div className="grid md:grid-cols-2 gap-10 md:gap-16 text-base md:text-lg text-[#3C443D] leading-[1.6] font-light text-left">
                <motion.div variants={fadeInUp}>
                  <p className="mb-6">
                    A advocacia não se resume à aplicação de modelos. Fatos, documentos, riscos e
                    objetivos precisam ser compreendidos antes da definição do caminho jurídico.
                  </p>
                  <p>
                    O trabalho do escritório parte dessa análise para construir estratégias adequadas às
                    particularidades de cada caso, com atenção à prova, às questões processuais e às
                    consequências práticas de cada decisão.
                  </p>
                </motion.div>
                <motion.div variants={fadeInUp}>
                  <p>
                    A relação com o cliente é conduzida com clareza, discrição e acompanhamento próximo
                    ao longo de toda a atuação.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 4. ÁREAS DE ATUAÇÃO */}
        <section className="py-20 bg-[#E3E0D7]">
          <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="space-y-0">
              
              <motion.div variants={fadeInUp} className="border-t border-[#A8ABA2]/30 py-10 flex flex-col md:flex-row gap-6 md:gap-12 group hover:bg-[#EDEDED]/50 transition-colors duration-500">
                <div className="text-[#95A08A] font-serif text-2xl md:text-3xl w-16">01</div>
                <div>
                  <h3 className="font-serif text-[#000000] text-2xl md:text-3xl mb-4">Direito Privado e Patrimonial</h3>
                  <p className="text-[#3C443D] font-light leading-relaxed max-w-2xl">
                    Atuação em questões contratuais, obrigacionais, patrimoniais e demais relações de direito privado, tanto na prevenção de conflitos quanto na condução de litígios que exijam análise jurídica aprofundada.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="border-t border-[#A8ABA2]/30 py-10 flex flex-col md:flex-row gap-6 md:gap-12 group hover:bg-[#EDEDED]/50 transition-colors duration-500">
                <div className="text-[#95A08A] font-serif text-2xl md:text-3xl w-16">02</div>
                <div>
                  <h3 className="font-serif text-[#000000] text-2xl md:text-3xl mb-4">Contencioso Estratégico e Recursos</h3>
                  <p className="text-[#3C443D] font-light leading-relaxed max-w-2xl">
                    Atuação em processos judiciais de maior complexidade, recursos, tutelas de urgência, mandados de segurança e outras medidas processuais que demandem análise aprofundada dos fatos, da prova e da estratégia processual.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="border-t border-b border-[#A8ABA2]/30 py-10 flex flex-col md:flex-row gap-6 md:gap-12 group hover:bg-[#EDEDED]/50 transition-colors duration-500">
                <div className="text-[#95A08A] font-serif text-2xl md:text-3xl w-16">03</div>
                <div>
                  <h3 className="font-serif text-[#000000] text-2xl md:text-3xl mb-4">Atuação perante o Superior Tribunal de Justiça</h3>
                  <p className="text-[#3C443D] font-light leading-relaxed max-w-2xl">
                    Atuação em recursos especiais e demais medidas processuais perante o Superior Tribunal de Justiça, desde a análise de viabilidade recursal até a estruturação da controvérsia de direito federal e o acompanhamento do processo perante a Corte.
                  </p>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </section>

        {/* 5. SITUAÇÕES EM QUE ATUAMOS */}
        <section className="py-24 bg-[#EDEDED]">
          <div className="container mx-auto px-6 md:px-12 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-16">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
                <motion.span variants={fadeInUp} className="text-[#A8ABA2] text-[11px] md:text-[13px] tracking-[0.2em] uppercase font-semibold mb-6 block">
                  Situações que exigem atuação estratégica
                </motion.span>
                <motion.h2 variants={fadeInUp} className="font-serif text-[#000000] text-3xl md:text-4xl leading-[1.2]">
                  Quando o processo exige uma análise<br />além do óbvio.
                </motion.h2>
              </motion.div>
              
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="space-y-8">
                {[
                  { title: "Conflitos contratuais", desc: "Análise de obrigações, inadimplementos e repercussões patrimoniais." },
                  { title: "Disputas patrimoniais relevantes", desc: "Litígios com alta repercussão financeira ou estratégica." },
                  { title: "Processos já em andamento", desc: "Reavaliação da estratégia diante da evolução do processo." },
                  { title: "Decisões desfavoráveis", desc: "Análise das medidas processuais cabíveis." },
                  { title: "Medidas urgentes", desc: "Situações que exigem resposta processual em prazo reduzido." },
                  { title: "Recursos aos Tribunais", desc: "Estruturação e acompanhamento da estratégia recursal." },
                  { title: "Questões submetidas ao Superior Tribunal de Justiça", desc: "Análise e condução de recursos e medidas processuais perante a Corte." }
                ].map((item, index) => (
                  <motion.div key={index} variants={fadeInUp} className="flex items-start gap-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#95A08A] mt-2.5 shrink-0"></span>
                    <div>
                      <p className="text-[#3C443D] text-lg font-medium">{item.title}</p>
                      <p className="text-[#7A8077] text-sm mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* 6. ENGENHARIA PROCESSUAL */}
        <section id="metodo" className="py-32 bg-[#3C443D] text-[#E3E0D7] overflow-hidden">
          <div className="container mx-auto px-6 md:px-12 lg:px-24">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="mb-20">
              <motion.span variants={fadeInUp} className="text-[#95A08A] text-[11px] md:text-[13px] tracking-[0.2em] uppercase font-semibold mb-6 block">
                Método
              </motion.span>
              <motion.h2 variants={fadeInUp} className="font-serif text-white text-4xl md:text-5xl mb-6">
                Engenharia Processual
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg font-light max-w-2xl text-[#A8ABA2]">
                Estratégia jurídica construída a partir dos fatos, da prova, do procedimento e das
                consequências de cada decisão.
              </motion.p>
            </motion.div>

            {/* Linha do Tempo Desktop */}
            <div className="hidden lg:block relative mt-32 mb-16">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-[#A8ABA2]/20"></div>
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                viewport={{ once: true }}
                className="absolute top-0 left-0 h-[1px] bg-[#95A08A]"
              ></motion.div>
              
              <div className="grid grid-cols-4 gap-8 pt-8">
                {[
                  { title: "Diagnóstico", desc: "Análise dos autos, documentos, fatos e riscos relevantes." },
                  { title: "Estratégia", desc: "Definição das alternativas processuais e dos objetivos da atuação." },
                  { title: "Preparação", desc: "Organização documental, probatória e preparação dos atos necessários." },
                  { title: "Acompanhamento", desc: "Monitoramento do processo e revisão da estratégia diante de novos fatos ou decisões." }
                ].map((step, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 * idx }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className="absolute -top-10 left-0 w-3 h-3 rounded-full bg-[#95A08A]"></div>
                    <span className="font-serif text-[#95A08A] text-xl mb-2 block">0{idx + 1}</span>
                    <h4 className="text-white font-medium mb-3">{step.title}</h4>
                    <p className="text-sm text-[#A8ABA2] font-light leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Lista Mobile */}
            <div className="lg:hidden space-y-12 mt-16 border-l border-[#A8ABA2]/20 pl-6 relative">
              {[
                  { title: "Diagnóstico", desc: "Análise dos autos, documentos, fatos e riscos relevantes." },
                  { title: "Estratégia", desc: "Definição das alternativas processuais e dos objetivos da atuação." },
                  { title: "Preparação", desc: "Organização documental, probatória e preparação dos atos necessários." },
                  { title: "Acompanhamento", desc: "Monitoramento do processo e revisão da estratégia diante de novos fatos ou decisões." }
                ].map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-[#95A08A]"></div>
                  <span className="font-serif text-[#95A08A] text-xl mb-1 block">0{idx + 1}</span>
                  <h4 className="text-white font-medium mb-2">{step.title}</h4>
                  <p className="text-sm text-[#A8ABA2] font-light leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. PERFIL PROFISSIONAL */}
        <section id="perfil" className="py-24 lg:py-0 bg-[#E3E0D7]">
          <div className="flex flex-col lg:flex-row min-h-[80vh]">
            {/* Foto 40% */}
            <div className="w-full lg:w-[40%] flex items-center justify-center p-6 md:p-12 lg:p-0 order-2 lg:order-1">
               <div className="relative w-full max-w-[320px] lg:max-w-[400px] aspect-[3/4]">
                 <Image 
                    src="/perfil.png" 
                    alt="Dr. Cássio Miguel Perfil" 
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 400px"
                  />
               </div>
            </div>
            
            {/* Texto 60% */}
            <div className="w-full lg:w-[60%] flex flex-col justify-center px-6 md:px-12 lg:px-24 py-16 lg:py-32 order-1 lg:order-2">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="max-w-2xl">
                <motion.span variants={fadeInUp} className="text-[#A8ABA2] text-[11px] md:text-[13px] tracking-[0.2em] uppercase font-semibold mb-6 block">
                  Perfil
                </motion.span>
                <motion.h2 variants={fadeInUp} className="font-serif text-[#000000] text-3xl md:text-5xl mb-8 leading-[1.1]">
                  Responsabilidade que<br />tem rosto e nome.
                </motion.h2>
                
                <motion.div variants={fadeInUp} className="mb-10">
                  <h3 className="text-lg font-medium text-[#000000]">Cássio Miguel de Oliveira Cavalcante</h3>
                  <p className="text-[#95A08A] text-sm tracking-wide">OAB/MS nº 22.647</p>
                </motion.div>

                <motion.div variants={fadeInUp} className="space-y-6 text-[#3C443D] font-light leading-relaxed">
                  <p>
                    Advogado com atuação profissional desde 2017, concentra sua prática em Direito Privado, Processo Civil e contencioso estratégico.
                  </p>
                  <p>
                    Atua na análise e condução de demandas judiciais, recursos e medidas de urgência, com participação direta na definição da estratégia e no acompanhamento dos casos do escritório.
                  </p>
                  <p>
                    Sua atuação também abrange recursos e medidas processuais perante os Tribunais, inclusive o Superior Tribunal de Justiça.
                  </p>
                </motion.div>
                
                <motion.div variants={fadeInUp} className="mt-12">
                  <Link 
                    href="/perfil"
                    className="inline-flex items-center text-[#3C443D] hover:text-[#000000] font-medium transition-colors text-sm uppercase tracking-widest border-b border-[#3C443D] pb-1"
                  >
                    Ver Perfil Completo <span className="ml-2">→</span>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 8. ANÁLISES JURÍDICAS */}
        <section id="analises" className="py-24 bg-[#EDEDED]">
          <div className="container mx-auto px-6 md:px-12 lg:px-24">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="mb-16">
              <motion.span variants={fadeInUp} className="text-[#A8ABA2] text-[11px] md:text-[13px] tracking-[0.2em] uppercase font-semibold mb-6 block">
                Análises
              </motion.span>
              <motion.h2 variants={fadeInUp} className="font-serif text-[#000000] text-3xl md:text-4xl max-w-xl leading-[1.2]">
                Pensar o processo também faz parte da estratégia.
              </motion.h2>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
              {/* Artigo Principal */}
              <motion.article 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} 
                className="lg:col-span-7 group cursor-pointer"
              >
                <div className="w-full h-64 md:h-[400px] bg-[#E3E0D7] mb-6 overflow-hidden relative flex items-center justify-center">
                   <div className="absolute inset-0 bg-[#3C443D]/10 group-hover:bg-transparent transition-colors duration-700 z-20 pointer-events-none"></div>
                   <div className="relative w-[45%] h-[65%] group-hover:scale-[1.03] transition-transform duration-700 z-10">
                     <Image 
                       src="/icone-artigo.jpg" 
                       alt="Análise Jurídica" 
                       fill 
                       className="object-contain object-center mix-blend-multiply"
                       sizes="(max-width: 1024px) 50vw, 30vw"
                     />
                   </div>
                </div>
                <div className="flex gap-4 items-center mb-4">
                  <span className="text-[#95A08A] text-xs font-semibold tracking-widest uppercase">Processo Cível</span>
                  <span className="text-[#A8ABA2] text-xs">5 min leitura</span>
                </div>
                <h3 className="font-serif text-2xl md:text-3xl text-[#000000] mb-4 group-hover:text-[#3C443D] transition-colors">
                  Quando uma decisão interlocutória pode ser impugnada imediatamente?
                </h3>
                <p className="text-[#3C443D] font-light leading-relaxed mb-6">
                  Uma análise sobre os limites do rol taxativo do agravo de instrumento e as alternativas estratégicas diante de decisões urgentes não previstas expressamente na legislação.
                </p>
                <span className="text-[#000000] text-sm uppercase tracking-widest font-medium group-hover:text-[#95A08A] transition-colors">Ler análise →</span>
              </motion.article>

              {/* Artigos Secundários */}
              <div className="lg:col-span-5 flex flex-col gap-12 lg:gap-0 justify-between">
                
                <motion.article initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="group cursor-pointer">
                  <div className="flex gap-4 items-center mb-3">
                    <span className="text-[#95A08A] text-xs font-semibold tracking-widest uppercase">Recurso Especial</span>
                    <span className="text-[#A8ABA2] text-xs">4 min leitura</span>
                  </div>
                  <h3 className="font-serif text-xl md:text-2xl text-[#000000] mb-3 group-hover:text-[#3C443D] transition-colors">
                    Recurso especial não é uma terceira instância: o que isso significa na prática?
                  </h3>
                  <p className="text-[#3C443D] font-light text-sm leading-relaxed mb-4">
                    Uma análise dos limites de atuação do Superior Tribunal de Justiça e dos aspectos que precisam ser considerados antes da interposição do recurso especial.
                  </p>
                  <span className="text-[#000000] text-xs uppercase tracking-widest font-medium group-hover:text-[#95A08A] transition-colors">Ler análise →</span>
                </motion.article>

                <div className="hidden lg:block w-full h-[1px] bg-[#A8ABA2]/20 my-auto"></div>

                <motion.article initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="group cursor-pointer">
                  <div className="flex gap-4 items-center mb-3">
                    <span className="text-[#95A08A] text-xs font-semibold tracking-widest uppercase">Estratégia Processual</span>
                    <span className="text-[#A8ABA2] text-xs">6 min leitura</span>
                  </div>
                  <h3 className="font-serif text-xl md:text-2xl text-[#000000] mb-3 group-hover:text-[#3C443D] transition-colors">
                    Tutela de urgência: o que realmente precisa ser demonstrado?
                  </h3>
                  <p className="text-[#3C443D] font-light text-sm leading-relaxed mb-4">
                    Além da teoria: como a organização da prova influencia a análise dos requisitos da tutela de urgência.
                  </p>
                  <span className="text-[#000000] text-xs uppercase tracking-widest font-medium group-hover:text-[#95A08A] transition-colors">Ler análise →</span>
                </motion.article>

              </div>
            </div>
          </div>
        </section>

        {/* 9. FAQ */}
        <section className="py-24 bg-[#E3E0D7]">
          <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="space-y-12">
              
              <motion.div variants={fadeInUp}>
                <h4 className="font-medium text-[#000000] mb-3">Como funciona o primeiro contato?</h4>
                <p className="text-[#3C443D] font-light leading-relaxed">
                  O primeiro contato destina-se a uma compreensão preliminar dos fatos. Solicitamos uma breve descrição do cenário para avaliarmos se a demanda se enquadra na área de especialidade e no escopo de atuação do escritório.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <h4 className="font-medium text-[#000000] mb-3">Como o escritório avalia uma nova demanda?</h4>
                <p className="text-[#3C443D] font-light leading-relaxed">
                  Através de uma análise documental rigorosa. Não emitimos pareceres ou adotamos estratégias baseadas apenas em relatos verbais; cada passo é planejado mediante o estudo aprofundado dos autos e das provas disponíveis.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <h4 className="font-medium text-[#000000] mb-3">Como são definidos o escopo e os honorários?</h4>
                <p className="text-[#3C443D] font-light leading-relaxed">
                  Os honorários são definidos após a análise inicial da demanda e da extensão do trabalho necessário. As condições da contratação são apresentadas individualmente, de acordo com o escopo da atuação.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <h4 className="font-medium text-[#000000] mb-3">Quem acompanha o processo?</h4>
                <p className="text-[#3C443D] font-light leading-relaxed">
                  Cássio Miguel participa diretamente da definição da estratégia e do acompanhamento dos momentos relevantes dos casos conduzidos pelo escritório, com o apoio da equipe jurídica conforme as necessidades de cada demanda.
                </p>
              </motion.div>

            </motion.div>
          </div>
        </section>

        {/* 10. CONTATO (CTA FINAL) */}
        <section id="contato" className="py-32 bg-[#D1BFA8] text-center">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
              <motion.span variants={fadeInUp} className="text-[#3C443D] text-[11px] md:text-[13px] tracking-[0.2em] uppercase font-semibold mb-6 block">
                Contato
              </motion.span>
              <motion.h2 variants={fadeInUp} className="font-serif text-[#000000] text-3xl md:text-5xl mb-6 leading-[1.1]">
                Uma questão jurídica começa<br />por uma boa compreensão do caso.
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-[#3C443D] text-lg font-light mb-12">
                Para conhecer a atuação do escritório ou encaminhar uma questão para análise, entre em contato.
              </motion.p>
              <motion.button 
                variants={fadeInUp}
                onClick={handleWhatsApp}
                className="inline-flex items-center justify-center bg-[#3C443D] text-[#E3E0D7] hover:bg-[#000000] hover:text-white px-8 py-4 text-sm font-medium transition-colors duration-300 rounded shadow-sm"
              >
                Entrar em contato <span className="ml-2">→</span>
              </motion.button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* 11. FOOTER */}
      <footer className="bg-[#3C443D] text-[#E3E0D7] py-16 border-t border-[#A8ABA2]/20">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            
            <div className="space-y-4">
              <h3 className="font-serif text-2xl text-white mb-6">Cássio Miguel</h3>
              <div className="text-sm font-light text-[#A8ABA2] space-y-1">
                <p className="text-[#E3E0D7] font-medium mb-2 uppercase tracking-wide">Cássio Miguel Sociedade Individual de Advocacia</p>
                <p>Cássio Miguel de Oliveira Cavalcante (OAB/MS nº 22.647)</p>
                <p>CNPJ: 43.734.988/0001-25</p>
                <p>Av. Afonso Pena, 5723 - Sala 11</p>
                <p>CEP: 79031-010 - Campo Grande/MS</p>
              </div>
            </div>

            <div className="space-y-4 text-sm font-light text-[#A8ABA2]">
              <h4 className="text-white font-medium mb-6 uppercase tracking-widest text-xs">Contato</h4>
              <p><a href="https://wa.me/5567996449627" className="hover:text-white transition-colors">+55 67 99644-9627</a></p>
              <p><a href="mailto:advogado@cassiomiguel.com.br" className="hover:text-white transition-colors">advogado@cassiomiguel.com.br</a></p>
            </div>

            <div className="space-y-4 text-sm font-light text-[#A8ABA2]">
              <h4 className="text-white font-medium mb-6 uppercase tracking-widest text-xs">Redes</h4>
              <p><a href="https://www.instagram.com/cassiomigueladv" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a></p>
            </div>

          </div>

          <div className="mt-16 pt-8 border-t border-[#A8ABA2]/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-light text-[#A8ABA2]">
            <p>&copy; 2026 Cássio Miguel Sociedade Individual de Advocacia</p>
            <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
