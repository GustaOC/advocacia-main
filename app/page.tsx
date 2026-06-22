'use client'

import Image from "next/image"
import { Scale, ShieldCheck, AlertTriangle, ScrollText, ChevronRight } from "lucide-react"
import { motion, Variants } from "framer-motion"

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
}

const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
}

const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

export default function PremiumLandingPage() {
  return (
    <div className="font-sans antialiased text-[#1f2622] bg-[#f4f5f0] selection:bg-[#4a5f51] selection:text-white overflow-hidden">
      
      {/* SEÇÃO 1: HERO */}
      <section className="relative w-full bg-[#303b32] text-[#f2f4f0] overflow-hidden flex items-center justify-center min-h-[600px] lg:h-[80vh]">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M54.627%200l.83.83-26.626%2026.627-.83-.83L54.627%200zm-5.83%200l.83.83-26.627%2026.627-.83-.83L48.796%200zm-5.83%200l.83.83-26.627%2026.627-.83-.83L42.966%200z%22%20fill%3D%22%23ffffff%22%20fill-opacity%3D%221%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]"></div>
        <div className="container mx-auto px-6 lg:px-16 relative z-10 grid lg:grid-cols-2 gap-8 items-center h-full pt-16 lg:pt-0">
          
          <motion.div 
            className="space-y-6 max-w-xl pb-12 lg:pb-0"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-8">
              <Image 
                src="/logo.png" 
                alt="Cássio Miguel Sociedade Individual de Advocacia" 
                width={240} 
                height={100} 
                className="object-contain"
                priority
              />
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="font-serif text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight tracking-tight text-white">
              Engenharia Processual para Casos de Alta Complexidade
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-base lg:text-lg font-light leading-relaxed text-[#c3cdc5]">
              Em litígios de alto impacto, a sua melhor defesa não é uma reação comum — é uma arquitetura estratégica. Proteja seu patrimônio, carreira e reputação com uma atuação cirúrgica nas esferas Civil e Administrativa.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="pt-4">
              <button className="border border-[#8b998a] text-white px-6 py-3 text-sm font-medium hover:bg-[#8b998a] hover:text-[#1f2622] transition-colors rounded-sm inline-flex items-center">
                [Agendar Consulta Estratégica Privada com o Dr. Cássio Miguel]
              </button>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="hidden lg:flex justify-end items-end h-full relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          >
            <div className="relative w-[110%] h-[110%] -mr-16 -mb-4">
              <Image 
                src="/hero.png" 
                alt="Dr. Cássio Miguel" 
                fill
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
                className="drop-shadow-2xl"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* SEÇÃO 2: O MANIFESTO */}
      <section className="py-20 bg-white relative overflow-hidden border-b border-[#e5e7e3]">
        <div className="absolute right-[-5%] top-[10%] opacity-[0.03] w-96 h-96 pointer-events-none">
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.984 9.07L14.4 7.656 16.52 9.778l-1.414 1.414-2.122-2.121zM9.449 14.727l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zM22.182 5.535l-2.121-2.121-1.414 1.414 2.121 2.121 1.414-1.414zM2.828 16.971L5.657 14.142l4.243 4.243-2.829 2.828-4.243-4.242zM15.101 11.899l4.242-4.242 1.415 1.414-4.243 4.243-1.414-1.415z"/></svg>
        </div>
        
        <motion.div 
          className="container mx-auto px-6 lg:px-16 relative z-10 max-w-4xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.span variants={fadeInUp} className="text-sm font-bold tracking-widest uppercase text-[#1f2622] block mb-4">O MANIFESTO</motion.span>
          <motion.h2 variants={fadeInUp} className="font-serif text-3xl lg:text-4xl font-bold leading-snug text-[#1f2622] mb-8">
            A diferença entre um processo comum e um desfecho favorável está nos detalhes da técnica.
          </motion.h2>
          <motion.div variants={fadeInUp} className="space-y-6 text-[#4a5f51] text-base leading-relaxed">
            <p>
              Na alta advocacia, não há espaço para amadorismo, teses genéricas ou modelos pré-formatados. Seja enfrentando um processo cível de alto valor econômico ou uma sindicância administrativa que ameaça sua liberdade de exercer a profissão, cada movimento precisa ser milimetricamente calculado.
            </p>
            <p>
              Grandes batalhas jurídicas são vencidas na engenharia processual: o domínio absoluto dos prazos, das nulidades, da produção de provas e da jurisprudência dominante. Nós não apenas defendemos; nós antecipamos os passos do oponente, neutralizando riscos antes que eles se transformem em prejuízos irreparáveis.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* SEÇÃO 3: ÁREAS DE DOMÍNIO */}
      <section className="py-20 bg-[#f4f5f0] border-b border-[#e5e7e3]">
        <div className="container mx-auto px-6 lg:px-16">
          <motion.div 
            className="mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <span className="text-sm font-bold tracking-widest uppercase text-[#1f2622] block mb-2">ÁREAS DE DOMÍNIO</span>
            <h2 className="font-serif text-2xl lg:text-3xl font-bold text-[#1f2622] max-w-xl">Atuação Cirúrgica Cível e Administrativa</h2>
            <p className="mt-4 text-[#4a5f51] font-light max-w-2xl">Unimos a precisão do Direito Processual Civil à firmeza necessária na defesa de prerrogativas administrativas:</p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 gap-x-12 gap-y-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="flex space-x-4">
              <div className="flex-shrink-0 mt-1 bg-[#303b32] w-10 h-10 rounded-md flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1f2622] mb-2">Cível</h3>
                <p className="text-[#4a5f51] text-sm leading-relaxed">
                  Defesa de direitos contratuais, disputas societárias de alta tensão e ações de responsabilidade civil de expressivo valor econômico.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex space-x-4">
              <div className="flex-shrink-0 mt-1 bg-[#303b32] w-10 h-10 rounded-md flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1f2622] mb-2">Blindagem de Carreira</h3>
                <p className="text-[#4a5f51] text-sm leading-relaxed">
                  Atuação preventiva e contenciosa para conter sanções administrativas, blindar a reputação profissional e assegurar paridade de armas.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex space-x-4">
              <div className="flex-shrink-0 mt-1 bg-[#303b32] w-10 h-10 rounded-md flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1f2622] mb-2">Urgência</h3>
                <p className="text-[#4a5f51] text-sm leading-relaxed">
                  Utilização ágil do Mandado de Segurança e de medidas liminares estratégicas para paralisar atos ilegais e abusos de autoridade.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex space-x-4">
              <div className="flex-shrink-0 mt-1 bg-[#303b32] w-10 h-10 rounded-md flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1f2622] mb-2">Recursos</h3>
                <p className="text-[#4a5f51] text-sm leading-relaxed">
                  Domínio absoluto da técnica recursal para reverter decisões desfavoráveis com agilidade e rigor científico.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SEÇÃO 4: O MÉTODO */}
      <section className="py-20 bg-[#e8eae6] relative">
        <div className="container mx-auto px-6 lg:px-16">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <h2 className="font-serif text-2xl lg:text-3xl font-bold text-[#1f2622] mb-2">O Método de Defesa Blindada</h2>
            <p className="text-[#4a5f51]">Como garantimos a paridade de armas como um processo de engenharia de elite.</p>
          </motion.div>

          <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8">
            
            <motion.div 
              className="flex flex-col gap-10 md:w-1/3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInLeft}
            >
              <div className="text-right">
                <span className="text-xl font-bold text-[#1f2622] block mb-1">01. Auditoria</span>
                <p className="text-[#4a5f51] text-xs leading-relaxed">Mapeamento integral e minucioso de cada prova, documento e cenário processual para identificar pontos vulneráveis.</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-[#1f2622] block mb-1">02. Alinhamento</span>
                <p className="text-[#4a5f51] text-xs leading-relaxed">Reuniões restritas de planejamento estratégico para estruturar o discurso e blindar testemunhos.</p>
              </div>
            </motion.div>

            <motion.div 
              className="md:w-1/3 flex justify-center opacity-70"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 0.7, scale: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true, margin: "-100px" }}
            >
               <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="10" width="180" height="180" stroke="#1f2622" strokeWidth="2"/>
                  <path d="M70 10V80H10" stroke="#1f2622" strokeWidth="2"/>
                  <path d="M190 70H120V10" stroke="#1f2622" strokeWidth="2"/>
                  <path d="M120 190V130H190" stroke="#1f2622" strokeWidth="2"/>
                  <path d="M10 130H80V190" stroke="#1f2622" strokeWidth="2"/>
                  <rect x="80" y="80" width="40" height="40" stroke="#1f2622" strokeWidth="2"/>
                  <circle cx="100" cy="100" r="10" stroke="#1f2622" strokeWidth="2"/>
               </svg>
            </motion.div>

            <motion.div 
              className="flex flex-col gap-10 md:w-1/3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInRight}
            >
              <div className="text-left">
                <span className="text-xl font-bold text-[#1f2622] block mb-1">03. Simulação Científica</span>
                <p className="text-[#4a5f51] text-xs leading-relaxed">Treinamento específico para interrogatórios e audiências cíveis, preparando o cliente para o cenário real.</p>
              </div>
              <div className="text-left">
                <span className="text-xl font-bold text-[#1f2622] block mb-1">04. Atuação Vigilante</span>
                <p className="text-[#4a5f51] text-xs leading-relaxed">Acompanhamento de atos críticos pelo próprio Dr. Cássio, garantindo proteção contra excessos e ilegalidades.</p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SEÇÃO 5: O PERFIL */}
      <section className="bg-[#28322a] py-20 lg:py-24 border-y border-[#3f4f44]">
        <div className="container mx-auto px-6 lg:px-16">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            <motion.div 
              className="lg:col-span-4 flex justify-center lg:justify-end relative"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInLeft}
            >
               <div className="bg-[#dcdfd8] rounded-[2rem] p-2 relative w-64 h-80 overflow-hidden shadow-2xl">
                 <Image 
                    src="/perfil.png" 
                    alt="Dr. Cássio Miguel" 
                    fill
                    style={{ objectFit: 'cover' }}
                    className="rounded-[1.5rem]"
                  />
               </div>
            </motion.div>

            <motion.div 
              className="lg:col-span-8 text-[#f2f4f0] max-w-2xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInRight}
            >
              <span className="text-sm font-bold tracking-widest uppercase text-[#8b998a] block mb-4">O PERFIL</span>
              <h2 className="font-serif text-3xl lg:text-4xl font-bold leading-tight mb-6">
                Cássio Miguel: A Ciência da Defesa Processual
              </h2>
              <div className="space-y-4 text-sm font-light text-[#c3cdc5] leading-relaxed">
                <p>
                  Cássio Miguel de Oliveira Cavalcante (OAB/MS nº 22.647) lidera uma banca dedicada a proteger o patrimônio e a integridade profissional de médicos, empresários e servidores públicos.
                </p>
                <p>
                  Reconhecido pela solidez intelectual e pelo profundo domínio das nuances processuais, sua advocacia afasta-se das soluções de massa para entregar um atendimento artesanal, altamente técnico e combativo. No cenário jurídico contemporâneo, onde detalhes processuais definem fortunas e destinos, o Dr. Cássio Miguel atua como o principal aliado de quem exige o padrão máximo de proteção jurídica.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SEÇÃO 6: CONSULTORIA E INVESTIMENTO */}
      <section className="py-20 bg-[#f4f5f0] border-b border-[#e5e7e3]">
        <div className="container mx-auto px-6 lg:px-16">
          <motion.div 
            className="mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <span className="text-sm font-bold tracking-widest uppercase text-[#1f2622] block mb-2">CONSULTORIA E INVESTIMENTO</span>
            <h2 className="font-serif text-2xl lg:text-3xl font-bold text-[#1f2622]">Condições de Contratação e Atendimento Premium</h2>
            <p className="text-[#4a5f51] text-sm mt-2">Atuação pautada pela transparência ética e dedicação exclusiva ao seu caso.</p>
          </motion.div>

          <motion.div 
            className="grid lg:grid-cols-2 gap-8 max-w-5xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="flex flex-col lg:flex-row gap-4">
              <div className="bg-[#303b32] text-white p-6 rounded-md flex-1">
                <h3 className="font-serif text-lg font-bold mb-2">1. Honorários de Pró-Labore</h3>
                <p className="text-xs text-[#aeb8b2] mb-4">Estudo, Engenharia Inicial e Atuação Ordinária</p>
                <p className="text-xs font-light text-[#c3cdc5] mb-6">
                  Garante a dedicação prioritária do escritório, análise minuciosa, elaboração de teses defensivas e acompanhamento dos atos ordinários.
                </p>
                <div className="text-xs font-light text-[#aeb8b2] border-t border-[#4a5f51] pt-4 space-y-2">
                  <p>Entrada: R$ [Inserir Valor] no ato.</p>
                  <p>Saldo: R$ [Inserir Valor] no mês subsequente.</p>
                </div>
              </div>
              <div className="bg-[#839181] text-white p-6 rounded-md flex-1 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-serif">R$ [Valor]</span>
                <span className="text-xs mt-2 block opacity-80">no mês subsequente</span>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col lg:flex-row gap-4">
              <div className="bg-[#303b32] text-white p-6 rounded-md flex-1">
                <h3 className="font-serif text-lg font-bold mb-2">2. Honorários de Êxito</h3>
                <p className="text-xs text-[#aeb8b2] mb-4">Foco no Resultado</p>
                <p className="text-xs font-light text-[#c3cdc5] mb-6">
                  Alinhamento de interesses: devidos estritamente no caso de desfecho vitorioso (arquivamento ou procedência total).
                </p>
                <div className="text-xs font-light text-[#aeb8b2] border-t border-[#4a5f51] pt-4 space-y-2">
                  <p>Entrada de Êxito (30%): R$ [Valor] em até 3 dias úteis.</p>
                  <p>Saldo (70%): R$ [Valor] parcelado em até 4x.</p>
                </div>
              </div>
              <div className="bg-[#839181] text-white p-6 rounded-md flex-1 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-serif">R$ [Valor]</span>
                <span className="text-xs mt-2 block opacity-80">em até 4x mensais</span>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* SEÇÃO 7: PERGUNTAS FREQUENTES */}
      <section className="py-20 bg-[#e8eae6] relative overflow-hidden">
        <div className="absolute right-[-10%] top-[-10%] opacity-[0.04] w-full h-full pointer-events-none">
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><path d="M12.984 9.07L14.4 7.656 16.52 9.778l-1.414 1.414-2.122-2.121zM9.449 14.727l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zM22.182 5.535l-2.121-2.121-1.414 1.414 2.121 2.121 1.414-1.414zM2.828 16.971L5.657 14.142l4.243 4.243-2.829 2.828-4.243-4.242zM15.101 11.899l4.242-4.242 1.415 1.414-4.243 4.243-1.414-1.415z"/></svg>
        </div>
        
        <motion.div 
          className="container mx-auto px-6 lg:px-16 max-w-4xl relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeInUp} className="font-serif text-2xl font-bold text-[#1f2622] mb-10 uppercase tracking-widest text-center">Perguntas Frequentes (FAQ)</motion.h2>

          <div className="space-y-8">
            <motion.div variants={fadeInUp}>
              <h4 className="font-bold text-sm mb-2 text-[#1f2622]">QA: O escritório atua em volume de processos?</h4>
              <p className="text-[#4a5f51] text-sm leading-relaxed">
                A: Não. Nossa atuação é estritamente "boutique". Limitamos o número de causas aceitas para que o Dr. Cássio Miguel e sua equipe técnica possam se dedicar pessoalmente aos detalhes de cada caso, garantindo um nível incomparável de zelo e estratégia processual.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <h4 className="font-bold text-sm mb-2 text-[#1f2622]">QA: Como funciona a atuação em casos cíveis e administrativos simultâneos?</h4>
              <p className="text-[#4a5f51] text-sm leading-relaxed">
                A: Casos de alta complexidade frequentemente geram reflexos em ambas as áreas. Nossa expertise permite que as defesas andem de forma coordenada, impedindo que uma manifestação na área administrativa prejudique o processo cível, e vice-versa.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <h4 className="font-bold text-sm mb-2 text-[#1f2622]">QA: O que não está contemplado nesta proposta?</h4>
              <p className="text-[#4a5f51] text-sm leading-relaxed">
                A: Mantemos o rigor da transparência: despesas de custas judiciais, taxas, perícias técnicas de assistentes externos e deslocamentos interestaduais não estão inclusos e são informados previamente. Atuações em novas instâncias ou ações autônomas paralelas não relacionadas à lide inicial demandam novos contratos específicos.
              </p>
            </motion.div>
            
            <motion.div variants={fadeInUp}>
              <h4 className="font-bold text-sm mb-2 text-[#1f2622]">QA: Qual a validade desta proposta?</h4>
              <p className="text-[#4a5f51] text-sm leading-relaxed">
                A: Devido à limitação de vagas em nossa carteira para garantir a máxima atenção aos clientes ativos, esta proposta de condições especiais tem validade improrrogável até 07/05/2026.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* SEÇÃO 8: FOOTER */}
      <footer className="bg-[#242d26] text-white py-16 text-center border-t border-[#3f4f44]">
        <motion.div 
          className="container mx-auto px-6 max-w-3xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeInUp}
        >
          <span className="text-sm font-bold tracking-widest uppercase text-[#8b998a] block mb-6">FOOTER</span>
          <h2 className="font-serif text-xl lg:text-2xl leading-snug mb-8 text-[#f2f4f0]">
            Quando a sua reputação e o seu patrimônio exigem a melhor defesa, a técnica é sua única garantia.
          </h2>
          
          <button className="border border-[#8b998a] bg-[#303b32] text-white px-6 py-3 text-sm font-medium hover:bg-[#8b998a] hover:text-[#1f2622] transition-colors rounded-sm inline-flex items-center mb-12">
            [Assegurar Minha Defesa Processual de Elite agora]
          </button>
          
          <div className="text-[10px] font-light text-[#8b998a] tracking-widest uppercase space-y-1">
            <p>Firma de Miguel</p>
            <p>CNPJ: [Inserir]</p>
            <p>OAB/MS nº 22.647</p>
            <p className="pt-2">All rights reserved</p>
          </div>
        </motion.div>
      </footer>
    </div>
  )
}