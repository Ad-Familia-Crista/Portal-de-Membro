import React from 'react';
import { useAuth } from '../AuthContext';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { maskCPF } from '../utils';

export const PrivacyConsent: React.FC<{ forceOpen?: boolean; onCloseForceOpen?: () => void }> = ({ 
  forceOpen, 
  onCloseForceOpen 
}) => {
  const { user, updateUser } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [age, setAge] = React.useState<string>('');
  const [responsibleName, setResponsibleName] = React.useState('');
  const [responsibleCPF, setResponsibleCPF] = React.useState('');
  const [minorName, setMinorName] = React.useState('');
  const [acceptance, setAcceptance] = React.useState<'agree' | 'disagree' | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Só abrir automaticamente se o usuário estiver logado e não tiver feito escolha formal ainda
    // Verificamos se !aceitou_politica (pode ser false padrão) E não há data de recusa
    if (user && !user.aceitou_politica && !user.data_recusa) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [user?.aceitou_politica, user?.data_recusa, !!user, forceOpen]);

  const isMinor = parseInt(age) < 18 && age !== '';

  const canConfirm = () => {
    if (!age || parseInt(age) < 0) return false;
    if (isMinor) {
      if (!responsibleName || !responsibleCPF || !minorName) return false;
    }
    if (!acceptance) return false;
    return true;
  };

  const handleConfirm = async () => {
    if (!canConfirm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const mockIp = '192.168.1.1'; // Mock IP for demonstration

      if (acceptance === 'agree') {
        await updateUser({
          aceitou_politica: true,
          data_aceite: now,
          ip_aceite: mockIp,
          consentGiven: true // Compatibility with old field if needed
        });
      } else {
        await updateUser({
          aceitou_politica: false,
          data_recusa: now,
          consentGiven: false
        });
        // Notify Admin/Secretary logic would go here (simulated)
        console.log('Notifying Admin/Secretary: User refused privacy policy');
      }
      setIsOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar consentimento:', error);
      alert('Erro ao salvar. Tente novamente. Detalhe: ' + (error?.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
      if (onCloseForceOpen) onCloseForceOpen();
    }
  };

  const isMandatory = !user?.aceitou_politica && !user?.data_recusa && user?.role === 'MEMBER';

  return (
    <Modal
      isOpen={isOpen}
      onClose={!isMandatory ? onCloseForceOpen : undefined}
      title="PRIMEIRO ACESSO – POLÍTICA DE PRIVACIDADE E CONSENTIMENTO"
      footer={
        <div className="w-full space-y-4">
          <div className="space-y-3 p-4 bg-muted/5 rounded-lg border border-muted/10">
            <p className="text-xs font-bold text-primary uppercase mb-2">Opções de Aceite</p>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="acceptance"
                checked={acceptance === 'agree'}
                onChange={() => setAcceptance('agree')}
                className="w-5 h-5 text-primary focus:ring-primary"
              />
              <span className="text-sm font-semibold text-muted group-hover:text-primary transition-colors">
                Li e concordo com a Política de Privacidade
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="acceptance"
                checked={acceptance === 'disagree'}
                onChange={() => setAcceptance('disagree')}
                className="w-5 h-5 text-primary focus:ring-primary"
              />
              <span className="text-sm font-semibold text-muted group-hover:text-primary transition-colors">
                Li e não concordo com a Política de Privacidade
              </span>
            </label>
          </div>
          
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm() || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Processando...' : 'Confirmar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-sm text-muted max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
          <Input 
            label="IDADE (obrigatório) *" 
            type="number" 
            min="0"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Sua idade"
          />

          {isMinor && (
            <div className="space-y-4 pt-2 border-t border-primary/10 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-bold text-amber-600 uppercase">Regra Especial para Menores de 18 Anos</p>
              <Input 
                label="NOME DO RESPONSÁVEL *" 
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
              />
              <Input 
                label="CPF DO RESPONSÁVEL *" 
                value={responsibleCPF}
                onChange={(e) => setResponsibleCPF(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
              />
              <Input 
                label="NOME DO MENOR *" 
                value={minorName}
                onChange={(e) => setMinorName(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="prose prose-sm max-w-none space-y-6">
          <section>
            <h3 className="font-bold text-primary uppercase mb-2">POLÍTICA DE PRIVACIDADE e CONSENTIMENTO</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-primary">1. Quem Somos</h4>
                <p>A Assembleia de Deus Família Cristã - Ministério Vila dos Remédios, pessoa jurídica de natureza religiosa, é responsável pelo tratamento dos dados pessoais coletados por meio do Portal do Membro. Em caso de dúvidas sobre esta política, o contato poderá ser realizado pelo e-mail da instituição.</p>
              </div>

              <div>
                <h4 className="font-bold text-primary">2. Quais Dados Coletamos</h4>
                <p>Coletamos apenas os dados necessários para fins administrativos internos, tais como:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Nome completo</li>
                  <li>CPF (armazenado parcialmente visível)</li>
                  <li>Data de nascimento</li>
                  <li>Endereço</li>
                  <li>Telefone</li>
                  <li>E-mail</li>
                  <li>Foto</li>
                  <li>Data de batismo / membresia</li>
                  <li>Informações ministeriais internas</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-primary">3. Finalidade do Uso dos Dados</h4>
                <p>Os dados são utilizados exclusivamente para:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Organização administrativa da igreja</li>
                  <li>Identificação de membros</li>
                  <li>Emissão de carteirinha digital</li>
                  <li>Comunicação institucional</li>
                  <li>Atualização cadastral</li>
                </ul>
                <p className="mt-2 font-semibold">A igreja não comercializa, vende ou compartilha dados com terceiros para fins comerciais.</p>
              </div>

              <div>
                <h4 className="font-bold text-primary">4. Dados Sensíveis</h4>
                <p>O vínculo religioso do membro é considerado dado sensível, sendo tratado com confidencialidade e utilizado apenas para fins internos da instituição.</p>
              </div>

              <div>
                <h4 className="font-bold text-primary">5. Armazenamento e Segurança</h4>
                <p>A igreja adota medidas de segurança compatíveis com sua estrutura, incluindo:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Acesso restrito por login individual</li>
                  <li>Controle de permissões</li>
                  <li>Cópia de segurança periódica</li>
                  <li>Não divulgação pública dos dados</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-primary">6. Direitos do Titular dos Dados</h4>
                <p>O membro poderá, a qualquer momento solicitar acesso, correção ou exclusão dos seus dados. Pedidos podem ser feitos pelo e-mail da igreja.</p>
              </div>

              <div>
                <h4 className="font-bold text-primary">7. Alterações na Política</h4>
                <p>Esta política poderá ser atualizada sempre que necessário para garantir maior segurança e conformidade legal.</p>
              </div>
            </div>
          </section>

          <section className="pt-4 border-t border-muted/10">
            <h3 className="font-bold text-primary uppercase mb-2">TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS</h3>
            
            {isMinor ? (
              <p className="font-semibold text-primary italic">
                EU ({responsibleName || 'NOME DO RESPONSÁVEL'}, {responsibleCPF || 'CPF'}), RESPONSÁVEL PELO(A) MENOR ({minorName || 'NOME DO MEMBRO'}), declaro que li e concordo com a Política de Privacidade.
              </p>
            ) : (
              <div className="space-y-2">
                <p>Declaro que estou ciente e de acordo com a Política de Privacidade da Assembleia de Deus Família Cristã - Ministério Vila dos Remédios.</p>
                <p>Autorizo o armazenamento e tratamento dos meus dados pessoais, inclusive dados relacionados à minha vinculação religiosa, exclusivamente para fins administrativos internos da igreja, emissão de carteirinha digital e comunicação institucional.</p>
                <p>Declaro que as informações fornecidas são verdadeiras e estou ciente de que poderei solicitar atualização ou exclusão dos meus dados, conforme previsto na legislação vigente.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
};
