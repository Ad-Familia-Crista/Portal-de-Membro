import React from 'react';
import { User, ShieldCheck, Calendar, MapPin, Globe } from 'lucide-react';
import { Logo } from './Logo';
import { Member } from '../types';

interface DigitalIDCardProps {
  member: Member;
}

export const DigitalIDCard: React.FC<DigitalIDCardProps> = ({ member }) => {
  // ASPECT RATIO: 1.586 (85,60 mm × 53,98 mm — Padrão Internacional ID-1 / CR-80)
  // Responsividade total via Container Queries (@container e cqw)

  const formatDisplayDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '---';

    // Trata formato YYYY-MM-DD
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

  // Se não houver validade registrada, calcula 18 meses a partir da última atualização ou da data atual
  const getValidUntil = (): string => {
    if (member.validUntil) return member.validUntil;
    const baseDate = member.lastUpdated ? new Date(member.lastUpdated) : new Date();
    baseDate.setMonth(baseDate.getMonth() + 18);
    return baseDate.toISOString().split('T')[0];
  };

  const displayValidUntil = getValidUntil();

  // Status funcional dinâmico do membro
  const isActive = member.status === 'ACTIVE';
  const statusColor = isActive ? '#34D399' : '#F87171';

  return (
    /*
     * CONTAINER PRINCIPAL — ID-1 / CR-80 (aspect-ratio 1.586)
     * Identidade Visual: GRAFITE (#26292E) + DOURADO (#EAAA00) + CREME (#EDE9D8) + BRANCO
     * Container Queries habilitado via @container
     * max-w-[500px]
     */
    <div
      className="w-full max-w-[500px] aspect-[1.586] @container rounded-[1.2cqw] shadow-2xl relative overflow-hidden select-none border border-white/10 flex flex-col"
      style={{
        backgroundColor: '#26292E',
        paddingTop: '1.4cqw',
        paddingLeft: '1.8cqw',
        paddingRight: '1.8cqw',
        paddingBottom: 0,
      }}
    >
      {/* ══════════════════════════════════════════════════════════
          1. CABEÇALHO — ALINHADO AO LADO DIREITO DA CARTEIRINHA
         ══════════════════════════════════════════════════════════ */}
      <div className="flex-none flex items-center justify-between relative z-10 w-full" style={{ gap: '2.5cqw' }}>
        {/* Container do Logo oficial no canto esquerdo */}
        <div
          className="shrink-0 bg-white rounded-[2cqw] flex items-center justify-center overflow-hidden shadow-lg border border-white/20"
          style={{ width: '17.5cqw', height: '17.5cqw', padding: '1.8cqw' }}
        >
          <Logo variant="icon" className="w-full h-auto drop-shadow-md" />
        </div>

        {/* Informações Institucionais — Alinhadas ao lado direito da carteirinha */}
        <div className="flex flex-col items-end text-right flex-1 overflow-hidden min-w-0">
          {/* Linha 1: ASSEMBLEIA DE DEUS + Família Cristã */}
          <div className="flex items-baseline gap-[1.5cqw] justify-end flex-nowrap leading-tight w-full">
            <h2
              className="font-display font-extrabold text-[#EAAA00] uppercase tracking-tight drop-shadow-sm whitespace-nowrap leading-tight"
              style={{ fontSize: '4.45cqw' }}
            >
              Assembleia de Deus
            </h2>
            <span
              className="font-script text-white leading-tight drop-shadow-sm whitespace-nowrap"
              style={{ fontSize: '4.75cqw', fontWeight: 700 }}
            >
              Família Cristã
            </span>
          </div>

          {/* Linha 2: Endereço e CNPJ (alinhados à direita) */}
          <div
            className="font-sans font-medium text-white/95 leading-[1.3] text-right w-full"
            style={{ fontSize: '2.65cqw', marginTop: '0.3cqw' }}
          >
            <p className="whitespace-nowrap text-right" style={{ fontSize: '2.72cqw' }}>
              Av. dos Remédios, Nº 458 - Vila dos Remédios, São Paulo - SP
            </p>
            <p className="font-bold whitespace-nowrap text-right">MINISTÉRIO VILA DOS REMÉDIOS | CNPJ: 05.538.396/0001-49</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. CORPO PRINCIPAL — RESPIRO COM CABEÇALHO + GRID PROPORCIONAL
         ══════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 flex flex-1 min-h-0 items-stretch"
        style={{
          marginTop: '3.0cqw',
          gap: '2.4cqw',
        }}
      >
        {/* ── COLUNA ESQUERDA (29%) — FOTOGRAFIA ── */}
        <div
          className="shrink-0 flex flex-col justify-start"
          style={{ width: '29%' }}
        >
          {/* Fotografia Quadrada */}
          <div
            className="w-full bg-black/20 rounded-[1.5cqw] overflow-hidden shadow-md relative shrink-0"
            style={{
              aspectRatio: '1 / 1',
              borderWidth: '0.35cqw',
              borderStyle: 'solid',
              borderColor: '#EAAA00',
            }}
          >
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.firstName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center" style={{ gap: '0.4cqw' }}>
                <User style={{ width: '9.2cqw', height: '9.2cqw' }} className="text-white/20" />
                <span
                  className="font-bold uppercase tracking-widest text-white/30 font-sans"
                  style={{ fontSize: '2.1cqw' }}
                >
                  FOTO
                </span>
              </div>
            )}

            {/* Indicador Circular de Status Ativo (dinâmico) */}
            <div
              className="absolute rounded-full border-white shadow-sm"
              style={{
                bottom: '1cqw',
                right: '1cqw',
                width: '2.3cqw',
                height: '2.3cqw',
                backgroundColor: statusColor,
                borderWidth: '0.4cqw',
                borderStyle: 'solid',
              }}
              title={isActive ? 'Membro Ativo' : 'Membro Inativo'}
            />
          </div>
        </div>

        {/* ── COLUNA DIREITA (71%) — CARDS COM FUNDO CREME ── */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ gap: '1.4cqw' }}
        >
          {/* Card 1: Nome Completo */}
          <div
            className="w-full flex items-center bg-white rounded-[1.5cqw] shadow-md shrink-0"
            style={{
              gap: '1.8cqw',
              paddingLeft: '2.4cqw',
              paddingRight: '2.4cqw',
              paddingTop: '2.0cqw',
              paddingBottom: '2.0cqw',
              borderLeftWidth: '0.8cqw',
              borderLeftStyle: 'solid',
              borderLeftColor: '#EAAA00',
            }}
          >
            <User
              className="shrink-0 text-[#EAAA00]"
              style={{ width: '4.6cqw', height: '4.6cqw' }}
            />
            <div className="flex flex-col overflow-hidden leading-tight">
              <span
                className="font-sans font-bold uppercase leading-none"
                style={{ fontSize: '1.5cqw', color: 'rgba(52, 52, 52, 0.55)', marginBottom: '0.3cqw' }}
              >
                Nome Completo
              </span>
              <span
                className="font-sans font-bold leading-none truncate text-[#343434]"
                style={{ fontSize: '3.0cqw' }}
              >
                {member.firstName} {member.lastName}
              </span>
            </div>
          </div>

          {/* Card 2: Cargo e Nascimento */}
          <div
            className="grid grid-cols-2 shrink-0"
            style={{ gap: '1.8cqw' }}
          >
            {/* Cargo */}
            <div
              className="flex items-center bg-white rounded-[1.5cqw] shadow-md overflow-hidden"
              style={{
                gap: '1.4cqw',
                padding: '1.9cqw 1.8cqw',
                borderLeftWidth: '0.7cqw',
                borderLeftStyle: 'solid',
                borderLeftColor: '#EAAA00',
              }}
            >
              <ShieldCheck
                className="shrink-0 text-[#EAAA00]"
                style={{ width: '4.0cqw', height: '4.0cqw' }}
              />
              <div className="flex flex-col overflow-hidden leading-tight">
                <span
                  className="font-sans font-bold uppercase leading-none"
                  style={{ fontSize: '1.4cqw', color: 'rgba(52, 52, 52, 0.55)', marginBottom: '0.3cqw' }}
                >
                  Cargo
                </span>
                <span
                  className="font-sans font-bold leading-none truncate text-[#343434]"
                  style={{ fontSize: '2.7cqw' }}
                >
                  {member.currentPosition || member.receivedAs || 'Membro'}
                </span>
              </div>
            </div>

            {/* Nascimento */}
            <div
              className="flex items-center bg-white rounded-[1.5cqw] shadow-md overflow-hidden"
              style={{
                gap: '1.4cqw',
                padding: '1.9cqw 1.8cqw',
                borderLeftWidth: '0.7cqw',
                borderLeftStyle: 'solid',
                borderLeftColor: '#EAAA00',
              }}
            >
              <Calendar
                className="shrink-0 text-[#EAAA00]"
                style={{ width: '4.0cqw', height: '4.0cqw' }}
              />
              <div className="flex flex-col overflow-hidden leading-tight">
                <span
                  className="font-sans font-bold uppercase leading-none"
                  style={{ fontSize: '1.4cqw', color: 'rgba(52, 52, 52, 0.55)', marginBottom: '0.3cqw' }}
                >
                  Nascimento
                </span>
                <span
                  className="font-sans font-bold leading-none truncate text-[#343434]"
                  style={{ fontSize: '2.7cqw' }}
                >
                  {formatDisplayDate(member.birthDate) !== '---'
                    ? formatDisplayDate(member.birthDate)
                    : member.birthDate}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Naturalidade e Nacionalidade */}
          <div
            className="grid grid-cols-2 shrink-0"
            style={{ gap: '1.8cqw' }}
          >
            {/* Naturalidade */}
            <div
              className="flex items-center bg-white rounded-[1.5cqw] shadow-md overflow-hidden"
              style={{
                gap: '1.4cqw',
                padding: '1.9cqw 1.8cqw',
                borderLeftWidth: '0.7cqw',
                borderLeftStyle: 'solid',
                borderLeftColor: '#EAAA00',
              }}
            >
              <MapPin
                className="shrink-0 text-[#EAAA00]"
                style={{ width: '4.0cqw', height: '4.0cqw' }}
              />
              <div className="flex flex-col overflow-hidden leading-tight">
                <span
                  className="font-sans font-bold uppercase leading-none"
                  style={{ fontSize: '1.4cqw', color: 'rgba(52, 52, 52, 0.55)', marginBottom: '0.3cqw' }}
                >
                  Naturalidade
                </span>
                <span
                  className="font-sans font-bold leading-none truncate text-[#343434]"
                  style={{ fontSize: '2.7cqw' }}
                >
                  {member.naturalness ? member.naturalness.split('-')[0].trim() : 'São Paulo'}
                </span>
              </div>
            </div>

            {/* Nacionalidade */}
            <div
              className="flex items-center bg-white rounded-[1.5cqw] shadow-md overflow-hidden"
              style={{
                gap: '1.4cqw',
                padding: '1.9cqw 1.8cqw',
                borderLeftWidth: '0.7cqw',
                borderLeftStyle: 'solid',
                borderLeftColor: '#EAAA00',
              }}
            >
              <Globe
                className="shrink-0 text-[#EAAA00]"
                style={{ width: '4.0cqw', height: '4.0cqw' }}
              />
              <div className="flex flex-col overflow-hidden leading-tight">
                <span
                  className="font-sans font-bold uppercase leading-none"
                  style={{ fontSize: '1.4cqw', color: 'rgba(52, 52, 52, 0.55)', marginBottom: '0.3cqw' }}
                >
                  Nacionalidade
                </span>
                <span
                  className="font-sans font-bold leading-none truncate text-[#343434]"
                  style={{ fontSize: '2.7cqw' }}
                >
                  {member.nationality || 'Brasileira'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. FAIXA INFERIOR — VALIDADE + ATUALIZAÇÃO E ASSINATURA CENTRALIZADA
         ══════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 w-full flex items-center justify-between"
        style={{
          marginTop: 'auto',
          paddingBottom: '2.0cqw',
          gap: '2.4cqw',
        }}
      >
        {/* VALIDADE e ATUALIZAÇÃO (alinhadas na coluna esquerda da foto) */}
        <div
          className="shrink-0 flex items-center justify-between"
          style={{
            width: '29%',
          }}
        >
          {/* Validade */}
          <div className="flex flex-col items-start" style={{ gap: '0.3cqw' }}>
            <span
              className="font-sans font-semibold uppercase leading-none text-white/70"
              style={{ fontSize: '1.5cqw' }}
            >
              Validade
            </span>
            <span
              className="font-sans font-bold text-white leading-none tracking-wide"
              style={{ fontSize: '2.3cqw' }}
            >
              {formatDisplayDate(displayValidUntil)}
            </span>
          </div>

          {/* Atualização */}
          <div className="flex flex-col items-start" style={{ gap: '0.3cqw' }}>
            <span
              className="font-sans font-semibold uppercase leading-none text-white/70"
              style={{ fontSize: '1.5cqw' }}
            >
              Atualização
            </span>
            <span
              className="font-sans font-bold text-white leading-none tracking-wide"
              style={{ fontSize: '2.3cqw' }}
            >
              {formatDisplayDate(member.lastUpdated)}
            </span>
          </div>
        </div>

        {/* ASSINATURA DO PASTOR PRESIDENTE (centralizada) */}
        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ paddingTop: '0.8cqw' }}
        >
          {/* Imagem da assinatura com a ponta inferior do "f" encostada na linha */}
          <div
            className="w-full flex items-end justify-center overflow-visible"
            style={{ height: '5.2cqw' }}
          >
            <img
              src="/assinatura.png"
              alt="Assinatura do Pastor Presidente"
              className="object-contain origin-bottom"
              style={{
                maxHeight: '260%',
                maxWidth: '93%',
                filter: 'invert(1)',
                opacity: 0.95,
                transform: 'scaleX(1.52) scaleY(1.10) translateY(1.1cqw)',
              }}
            />
          </div>

          {/* Linha horizontal imediatamente abaixo da assinatura */}
          <div
            className="border-t border-white/40"
            style={{ width: '84%', marginTop: '0', marginBottom: '0.2cqw' }}
          />

          {/* Label da assinatura */}
          <span
            className="font-sans font-semibold text-white/70 uppercase leading-none tracking-wider text-center"
            style={{ fontSize: '1.25cqw' }}
          >
            Assinatura do Pastor Presidente
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          4. FRISO DOURADO INFERIOR (0.6cqw)
         ══════════════════════════════════════════════════════════ */}
      <div
        className="w-full shrink-0 relative z-10"
        style={{
          height: '0.6cqw',
          backgroundColor: '#EAAA00',
          marginLeft: '-1.8cqw',
          marginRight: '-1.8cqw',
          width: 'calc(100% + 3.6cqw)',
        }}
      />
    </div>
  );
};
