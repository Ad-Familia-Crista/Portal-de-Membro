import React from 'react';
import { User, ShieldCheck, Calendar, MapPin, Globe } from 'lucide-react';
import { Logo } from './Logo';
import { Member } from '../types';

interface DigitalIDCardProps {
  member: Member;
}

export const DigitalIDCard: React.FC<DigitalIDCardProps> = ({ member }) => {
  // ASPECT RATIO is ~1.586
  // We use relative units (%) to ensure responsiveness while maintaining the design proportions

  const formatDisplayDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '---';
    
    // Trata formato YYYY-MM-DD (comum no banco para datas simples)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Se não tiver validade salva, calcula 18 meses a partir da última atualização ou de hoje
  const getValidUntil = () => {
    if (member.validUntil) return member.validUntil;
    
    const baseDate = member.lastUpdated ? new Date(member.lastUpdated) : new Date();
    baseDate.setMonth(baseDate.getMonth() + 18);
    return baseDate.toISOString().split('T')[0];
  };

  const displayValidUntil = getValidUntil();

  return (
    <div className="w-full max-w-[500px] aspect-[1.586] @container id-card-gradient rounded-[3cqw] p-[1.5cqw] pb-[2cqw] text-white shadow-2xl relative overflow-hidden font-sans select-none border border-white/10 flex flex-col">
      {/* Header */}
      <div className="flex-none flex items-center justify-start gap-[2.5cqw] relative w-full mb-[1cqw]">
        {/* Logo Area */}
        <div className="w-[18cqw] h-[18cqw] bg-white rounded-[2cqw] flex items-center justify-center overflow-hidden p-[2cqw] shadow-lg border border-white/20 shrink-0">
          <Logo variant="icon" className="w-[100%] h-auto drop-shadow-md" />
        </div>

        {/* Church Info */}
        <div className="flex flex-col items-start flex-1 pr-[2cqw]">
          <div className="flex items-baseline justify-start gap-[1.5cqw] mb-[0.2cqw]">
            <h2 className="text-[4.2cqw] font-display font-extrabold text-secondary leading-tight uppercase tracking-tight drop-shadow-sm">
              Assembleia de Deus
            </h2>
            <span className="font-script text-[3.8cqw] text-white leading-tight whitespace-nowrap drop-shadow-sm">
              Família Cristã
            </span>
          </div>

          <div className="text-[2.2cqw] opacity-95 font-sans font-medium text-white/95 leading-[1.3] mt-[0.5cqw]">
            <p>Av. dos Remédios, Nº 458 - Vila dos Remédios, São Paulo - SP</p>
            <p className="font-bold">MINISTÉRIO VILA DOS REMÉDIOS | CNPJ: 05.538.396/0001-49</p>
          </div>
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 flex gap-[3cqw] mt-[1cqw]">
        {/* Photo Area Column */}
        <div className="w-[28%] flex flex-col shrink-0 h-full">
          <div className="w-full aspect-square bg-white/10 rounded-[1.5cqw] overflow-hidden border-[0.2cqw] border-white/20 shadow-xl relative mb-[1cqw]">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.firstName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-[0.5cqw]">
                <User className="w-[9cqw] h-[9cqw] text-white/20" />
                <span className="text-[2.2cqw] font-bold opacity-30 uppercase tracking-widest text-white/40">FOTO</span>
              </div>
            )}
            <div className="absolute bottom-[1cqw] right-[1cqw] bg-emerald-400 w-[2.2cqw] h-[2.2cqw] rounded-full border-[0.4cqw] border-white shadow-sm" />
          </div>

          {/* Validade & Atualização directly under photo like image */}
          <div className="mt-auto mb-[2.5cqw] md:mb-0 flex w-full gap-[1.5cqw] justify-between z-10 px-[0.5cqw]">
            <div className="flex flex-col items-start gap-[0.2cqw]">
              <span className="text-[1.4cqw] font-display font-semibold text-white/70 uppercase leading-none">Validade</span>
              <span className="text-[2.1cqw] font-sans font-bold text-white leading-none tracking-wide">{formatDisplayDate(displayValidUntil)}</span>
            </div>

            <div className="flex flex-col items-start gap-[0.2cqw]">
              <span className="text-[1.4cqw] font-display font-semibold text-white/70 uppercase leading-none">Atualização</span>
              <span className="text-[2.1cqw] font-sans font-bold text-white leading-none tracking-wide">{formatDisplayDate(member.lastUpdated)}</span>
            </div>
          </div>
        </div>

        {/* Info Grid (Icon Fields Layout) */}
        <div className="flex-1 flex flex-col justify-start gap-[1.8cqw]">
          {/* Row 1: NOME */}
          <div className="w-full flex items-center gap-[1.8cqw] bg-[#EDE9D8] rounded-[1.5cqw] px-[2.2cqw] py-[1.8cqw] shadow-md border-l-[0.8cqw] border-secondary">
            <User className="w-[4.2cqw] h-[4.2cqw] text-primary/40 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[1.5cqw] font-sans font-bold text-primary/50 uppercase leading-none mb-[0.2cqw]">Nome Completo</span>
              <span className="text-[2.8cqw] font-sans font-bold text-primary leading-none truncate">{member.firstName} {member.lastName}</span>
            </div>
          </div>

          {/* Row 2: Cargo & Nascimento */}
          <div className="grid grid-cols-2 gap-[1.8cqw]">
            <div className="flex items-center gap-[1.2cqw] bg-[#EDE9D8] rounded-[1.5cqw] px-[1.5cqw] py-[1.8cqw] shadow-md">
              <ShieldCheck className="w-[3.8cqw] h-[3.8cqw] text-primary/40 shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[1.4cqw] font-sans font-bold text-primary/50 uppercase leading-none mb-[0.2cqw]">Cargo</span>
                <span className="text-[2.6cqw] font-sans font-bold text-primary leading-none truncate pt-[0.2cqw]">{member.currentPosition || member.receivedAs}</span>
              </div>
            </div>
            <div className="flex items-center gap-[1.2cqw] bg-[#EDE9D8] rounded-[1.5cqw] px-[1.5cqw] py-[1.8cqw] shadow-md">
              <Calendar className="w-[3.8cqw] h-[3.8cqw] text-primary/40 shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[1.4cqw] font-sans font-bold text-primary/50 uppercase leading-none mb-[0.2cqw]">Nascimento</span>
                <span className="text-[2.6cqw] font-sans font-bold text-primary leading-none truncate pt-[0.2cqw]">{member.birthDate}</span>
              </div>
            </div>
          </div>

          {/* Row 3: Naturalidade & Nacionalidade */}
          <div className="grid grid-cols-2 gap-[1.8cqw]">
            <div className="flex items-center gap-[1.2cqw] bg-[#EDE9D8] rounded-[1.5cqw] px-[1.5cqw] py-[1.8cqw] shadow-md">
              <MapPin className="w-[3.8cqw] h-[3.8cqw] text-primary/40 shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[1.4cqw] font-sans font-bold text-primary/50 uppercase leading-none mb-[0.2cqw]">Naturalidade</span>
                <span className="text-[2.6cqw] font-sans font-bold text-primary leading-none truncate pt-[0.2cqw]">{member.naturalness ? member.naturalness.split('-')[0].trim() : 'São Paulo'}</span>
              </div>
            </div>
            <div className="flex items-center gap-[1.2cqw] bg-[#EDE9D8] rounded-[1.5cqw] px-[1.5cqw] py-[1.8cqw] shadow-md">
              <Globe className="w-[3.8cqw] h-[3.8cqw] text-primary/40 shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[1.4cqw] font-sans font-bold text-primary/50 uppercase leading-none mb-[0.2cqw]">Nacionalidade</span>
                <span className="text-[2.6cqw] font-sans font-bold text-primary leading-none truncate pt-[0.2cqw]">{member.nationality || 'Brasileira'}</span>
              </div>
            </div>
          </div>

          {/* Signature Area (President) */}
          <div className="mt-auto flex flex-col items-center relative z-20 pt-[1cqw] md:pt-[1.5cqw] md:translate-y-[1cqw]">
            <div className="h-[5.5cqw] md:h-[5.5cqw] w-full flex items-end justify-center z-10 overflow-visible">
              <img
                src="/assinatura.png"
                alt="Assinatura"
                className="max-h-[250%] md:max-h-[190%] max-w-[90%] md:max-w-[100%] object-contain invert opacity-90 drop-shadow-sm origin-bottom translate-y-[1cqw] md:translate-y-[1.5cqw] scale-x-[1.60] md:scale-x-[1.70]"
              />
            </div>
            <span className="text-[1.3cqw] md:text-[1.3cqw] font-sans font-semibold text-white/60 md:text-white/70 uppercase leading-none tracking-wider mt-[0.2cqw] md:mt-[0.2cqw]">Assinatura do Pastor Presidente</span>
          </div>
        </div>
      </div>

      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Bottom Stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-[0.6cqw] bg-secondary" />
    </div>
  );
};
