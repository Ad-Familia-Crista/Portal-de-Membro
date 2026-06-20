import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DEPARTMENTS, CONSECRATIONS, POSITIONS, CHILD_DEPARTMENTS } from '../types';
import { motion } from 'motion/react';
import { maskCPF, maskRG, maskCEP, maskPhone, maskDate, maskMonthYear, maskYear } from '../utils';
import { Plus, Trash2, Camera, Info as InfoIcon, ShieldAlert, History } from 'lucide-react';
import { useToast } from '../components/Toast';

const schema = z.object({
  firstName: z.string().min(1, 'Nome completo é obrigatório'),
  cpf: z.string().min(14, 'CPF inválido'),
  rg: z.string().min(12, 'RG inválido'),
  birthDate: z.string().min(10, 'Data de nascimento inválida'),
  naturalness: z.string().min(1, 'Naturalidade é obrigatória'),
  nationality: z.string().min(1, 'Nacionalidade é obrigatória'),
  maritalStatus: z.string().min(1, 'Estado civil é obrigatório'),
  
  marriageDate: z.string().optional(),
  spouseName: z.string().optional(),
  hasChildren: z.string().min(1, 'Selecione se possui filhos'),
  children: z.array(z.object({
    name: z.string().min(1, 'Nome do filho é obrigatório'),
    cpf: z.string().min(14, 'CPF do filho é obrigatório'),
    birthDate: z.string().min(10, 'Data de nascimento do filho é obrigatória'),
    congregates: z.string().min(1, 'Selecione se congrega conosco'),
    departments: z.array(z.string()).optional()
  })).optional(),

  cep: z.string().min(9, 'CEP inválido'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'UF é obrigatória'),

  cell: z.string().min(14, 'WhatsApp é obrigatório'),
  phones: z.array(z.object({ number: z.string().min(14, 'Telefone inválido') })).optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),

  education: z.string().optional(),
  profession: z.string().optional(),

  isBaptized: z.string().min(1, 'Selecione se é batizado'),
  baptismChurch: z.string().optional(),
  baptismDate: z.string().optional(),
  isHolySpiritBaptized: z.string().min(1, 'Selecione se é batizado no E.S.'),
  entryDate: z.string().min(4, 'Ano de entrada é obrigatório'),
  previousChurch: z.string().optional(),
  participatesInConvention: z.string().optional(),
  conventionName: z.string().optional(),

  receivedAs: z.enum(['MEMBRO', 'CONGREGADO']).optional(),
  departments: z.array(z.string()).optional(),
  currentPosition: z.string().optional(),
  positionStartDate: z.string().optional(),
  consecratedTo: z.string().optional(),
  consecrationDate: z.string().optional(),
  ministerialHistory: z.array(z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    date: z.string(),
    registeredBy: z.string()
  })).optional(),
  photoUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.maritalStatus === 'Casado') {
    if (!data.marriageDate || data.marriageDate.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data de casamento é obrigatória",
        path: ["marriageDate"],
      });
    }
    if (!data.spouseName || data.spouseName.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome do cônjuge é obrigatório",
        path: ["spouseName"],
      });
    }
  }

  if (data.hasChildren === 'Sim') {
    if (!data.children || data.children.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adicione pelo menos um filho",
        path: ["hasChildren"],
      });
    }
  }
});

export const RegistrationForm: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [step, setStep] = React.useState(1);
  const totalSteps = 8;
  const [cepError, setCepError] = React.useState('');
  const [isSubmittingForm, setIsSubmittingForm] = React.useState(false);
  const isAdminOrSecretary = user?.role === 'ADMIN' || user?.role === 'SECRETARY';

  const { register, handleSubmit, watch, setValue, control, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      // IMPORTANTE: o ...user vem primeiro, mas os campos abaixo SOBRESCREVEM seus valores
      ...user,
      // Converter valores null/number do banco para string vazia (Zod .optional() não aceita null)
      firstName: user?.firstName || '',
      cpf: user?.cpf || '',
      rg: user?.rg || '',
      birthDate: user?.birthDate || '',
      naturalness: user?.naturalness || '',
      nationality: user?.nationality || '',
      maritalStatus: user?.maritalStatus || '',
      marriageDate: user?.marriageDate || '',
      spouseName: user?.spouseName || '',
      cep: user?.cep || '',
      address: user?.address || '',
      number: user?.number || '',
      complement: user?.complement || '',
      neighborhood: user?.neighborhood || '',
      city: user?.city || '',
      state: user?.state || '',
      cell: user?.cell || '',
      email: user?.email || '',
      education: user?.education ? (user.education.startsWith('Ensino ') ? user.education : `Ensino ${user.education}`) : '',
      profession: user?.profession || '',
      baptismChurch: user?.baptismChurch || '',
      baptismDate: user?.baptismDate || '',
      // entryDate pode vir como número do banco (ex: 2021) - converter para string
      entryDate: user?.entryDate ? String(user.entryDate) : '',
      previousChurch: user?.previousChurch || '',
      conventionName: user?.conventionName || '',
      leaderDepartment: user?.leaderDepartment || '',
      consecratedTo: user?.consecratedTo || '',
      consecrationDate: user?.consecrationDate || '',
      // receivedAs: z.enum não aceita null
      receivedAs: (user?.receivedAs === 'MEMBRO' || user?.receivedAs === 'CONGREGADO')
        ? user.receivedAs
        : undefined,
      // Campos booleanos convertidos para string Sim/Não (DEVEM vir após o ...user)
      hasChildren: user?.hasChildren ? 'Sim' : 'Não',
      isBaptized: user?.isBaptized ? 'Sim' : 'Não',
      isHolySpiritBaptized: user?.isHolySpiritBaptized ? 'Sim' : 'Não',
      participatesInConvention: user?.participatesInConvention ? 'Sim' : 'Não',
      // Arrays
      children: user?.children?.map(c => ({ ...c, congregates: c.congregates ? 'Sim' : 'Não' })) || [],
      phones: user?.phones?.map(p => typeof p === 'string' ? { number: p } : p) || [],
      departments: user?.departments || [],
      currentPosition: user?.currentPosition || 'Membro',
      positionStartDate: user?.positionStartDate || new Date().toISOString().split('T')[0],
      ministerialHistory: user?.ministerialHistory || [],
      photoUrl: user?.photoUrl || '',
    }
  });

  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
    control,
    name: "children"
  });

  const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
    control,
    name: "phones"
  });

  const maritalStatus = watch('maritalStatus');
  const hasChildren = watch('hasChildren');
  const isBaptized = watch('isBaptized');
  const participatesInConvention = watch('participatesInConvention');
  const watchChildren = watch('children');

  // Limpeza de dados residuais para evitar erros de validação em campos escondidos
  React.useEffect(() => {
    if (maritalStatus !== 'Casado' && step === 2) {
      setValue('marriageDate', '');
      setValue('spouseName', '');
    }
  }, [maritalStatus, setValue, step]);

  React.useEffect(() => {
    if (hasChildren === 'Não' && step === 2) {
      setValue('children', []);
    }
  }, [hasChildren, setValue, step]);


  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskCEP(e.target.value);
    setValue('cep', value);
    setCepError('');

    const cleanCEP = value.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (data.erro) {
          setCepError('CEP não encontrado');
        } else {
          setValue('address', data.logradouro);
          setValue('neighborhood', data.bairro);
          setValue('city', data.localidade);
          setValue('state', data.uf);
        }
      } catch (error) {
        setCepError('Erro ao buscar CEP');
      }
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmittingForm(true);
    try {
      const formattedData = {
        ...data,
        hasChildren: data.hasChildren === 'Sim',
        isBaptized: data.isBaptized === 'Sim',
        isHolySpiritBaptized: data.isHolySpiritBaptized === 'Sim',
        participatesInConvention: data.participatesInConvention === 'Sim',
        children: data.children?.map((c: any) => ({ ...c, congregates: c.congregates === 'Sim' })) || [],
        phones: data.phones?.map((p: any) => p.number) || [],
      };
      await updateUser(formattedData);
      showToast('Cadastro atualizado com sucesso!', 'success');
      setTimeout(() => setStep(1), 2000);
    } catch (error: any) {
      console.error('Erro ao salvar cadastro:', error);
      showToast(error.message || 'Erro ao salvar. Verifique sua conexão.', 'error');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const onError = (errors: any) => {
    const fieldMapping: Record<string, number> = {
      firstName: 1, cpf: 1, rg: 1, birthDate: 1, naturalness: 1, nationality: 1,
      maritalStatus: 2, marriageDate: 2, spouseName: 2, hasChildren: 2, children: 2,
      cep: 3, address: 3, number: 3, neighborhood: 3, city: 3, state: 3,
      cell: 4, email: 4, phones: 4,
      education: 5, profession: 5,
      isBaptized: 6, baptismChurch: 6, baptismDate: 6, isHolySpiritBaptized: 6,
      entryDate: 6, previousChurch: 6, participatesInConvention: 6, conventionName: 6,
      receivedAs: 7, currentPosition: 7, positionStartDate: 7, departments: 7,
      consecratedTo: 7, consecrationDate: 7
    };

    // Log detalhado para diagnóstico
    console.error('❌ Erros de validação no formulário:', JSON.stringify(errors, null, 2));

    const firstErrorField = Object.keys(errors)[0];
    const baseField = firstErrorField?.split('.')?.[0] || '';
    const targetStep = fieldMapping[baseField] || fieldMapping[firstErrorField];
    const errorMsg = errors[firstErrorField]?.message || errors[baseField]?.message || 'verifique os campos';

    if (targetStep) {
      setStep(targetStep);
      showToast(
        `Campo com erro na Etapa ${targetStep}: "${errorMsg}". Por favor, corrija e tente novamente.`,
        'error'
      );
      setTimeout(() => {
        const errorElement = document.querySelector('[class*="text-red-500"]');
        if (errorElement) errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else {
      showToast(
        `Erro de validação: "${errorMsg}". Revise todas as etapas.`,
        'error'
      );
    }
  };

  const nextStep = async () => {
    const isBaptizedVal = watch('isBaptized');
    const participatesVal = watch('participatesInConvention');
    const maritalStatusVal = watch('maritalStatus');
    const hasChildrenVal = watch('hasChildren');

    const fieldsByStep: Record<number, string[]> = {
      1: ['firstName', 'cpf', 'rg', 'birthDate', 'naturalness', 'nationality'],
      // Etapa 2: campos condicionais só validados se visíveis
      2: [
        'maritalStatus', 'hasChildren',
        ...(maritalStatusVal === 'Casado' ? ['marriageDate', 'spouseName'] : []),
        ...(hasChildrenVal === 'Sim' ? ['children'] : []),
      ],
      3: ['cep', 'address', 'number', 'neighborhood', 'city', 'state'],
      4: ['cell', 'email', 'phones'],
      5: ['education', 'profession'],
      // Etapa 6: campos condicionais só validados se visíveis
      6: [
        'isBaptized', 'isHolySpiritBaptized', 'entryDate', 'participatesInConvention',
        ...(isBaptizedVal === 'Sim' ? ['baptismChurch', 'baptismDate'] : []),
        ...(participatesVal === 'Sim' ? ['conventionName'] : []),
      ],
      // Etapa 7: membro comum não edita nada (somente leitura), admin/secretária valida campos visíveis
      7: isAdminOrSecretary
        ? ['currentPosition', 'positionStartDate']
        : [],
    };

    const fieldsToValidate = fieldsByStep[step] || [];
    const isStepValid = await trigger(fieldsToValidate as any);

    if (isStepValid) {
      setStep(s => Math.min(s + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showToast('Por favor, preencha todos os campos obrigatórios desta etapa antes de prosseguir.', 'error');
    }
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <ToastContainer />
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-display font-bold text-primary">Atualizar Cadastro</h1>
        <span className="text-sm font-bold text-primary">Passo {step} de {totalSteps}</span>
      </div>
      
      <div className="w-full bg-muted/20 h-2 rounded-full overflow-hidden mb-8">
        <motion.div 
          className="bg-secondary h-full" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card title="1 - Informações Básicas de Identificação">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome Completo *" {...register('firstName')} error={errors.firstName?.message} />
                <Controller
                  name="cpf"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      label="CPF *" 
                      {...field} 
                      onChange={(e) => field.onChange(maskCPF(e.target.value))}
                      error={errors.cpf?.message} 
                      placeholder="000.000.000-00"
                    />
                  )}
                />
                <Controller
                  name="rg"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      label="RG *" 
                      {...field} 
                      onChange={(e) => field.onChange(maskRG(e.target.value))}
                      error={errors.rg?.message} 
                      placeholder="00.000.000-0"
                    />
                  )}
                />
                <Controller
                  name="birthDate"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      label="Data de Nascimento *" 
                      {...field} 
                      onChange={(e) => field.onChange(maskDate(e.target.value))}
                      error={errors.birthDate?.message} 
                      placeholder="DD/MM/AAAA"
                    />
                  )}
                />
                <Input label="Naturalidade * (Ex: Rio de Janeiro-RJ)" {...register('naturalness')} error={errors.naturalness?.message} />
                <Input label="Nacionalidade * (Ex: Brasileiro(a))" {...register('nationality')} error={errors.nationality?.message} />
              </div>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card title="2 - Informações Conjugais e Familiares">
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-primary">Estado Civil *</label>
                  <select {...register('maritalStatus')} className="flex h-10 w-full rounded-md border border-muted/30 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Selecione...</option>
                    <option value="Solteiro">Solteiro(a)</option>
                    <option value="Casado">Casado(a)</option>
                    <option value="Viúvo">Viúvo(a)</option>
                    <option value="Separado">Separado(a)</option>
                  </select>
                  {errors.maritalStatus && <p className="text-xs text-red-500">{errors.maritalStatus.message}</p>}
                </div>

                {maritalStatus === 'Casado' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <Controller
                      name="marriageDate"
                      control={control}
                      render={({ field }) => (
                        <Input 
                          label="Data de Casamento *" 
                          {...field} 
                          onChange={(e) => field.onChange(maskDate(e.target.value))}
                          placeholder="DD/MM/AAAA"
                        />
                      )}
                    />
                    <Input label="Nome do Cônjuge *" {...register('spouseName')} />
                  </div>
                )}

                {maritalStatus && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-semibold text-primary">Possui Filhos? *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" value="Sim" {...register('hasChildren')} /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" value="Não" {...register('hasChildren')} /> Não
                      </label>
                    </div>
                  </div>
                )}

                {hasChildren === 'Sim' && (
                  <div className="space-y-4 pt-4 border-t border-muted/10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-primary">Filhos</h4>
                      <Button type="button" size="sm" variant="outline" onClick={() => appendChild({ name: '', cpf: '', birthDate: '', congregates: 'Não' })}>
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Filho
                      </Button>
                    </div>

                    {childFields.map((field, index) => (
                      <div key={field.id} className="p-4 bg-background/30 rounded-lg border border-muted/10 space-y-4 relative">
                        <button type="button" onClick={() => removeChild(index)} className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50 p-1 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input label="Nome do Filho(a) *" {...register(`children.${index}.name`)} error={errors.children?.[index]?.name?.message} />
                          <Controller
                            name={`children.${index}.cpf`}
                            control={control}
                            render={({ field }) => (
                              <Input 
                                label="CPF *" 
                                {...field} 
                                onChange={(e) => field.onChange(maskCPF(e.target.value))}
                                placeholder="000.000.000-00"
                                error={errors.children?.[index]?.cpf?.message}
                              />
                            )}
                          />
                          <Controller
                            name={`children.${index}.birthDate`}
                            control={control}
                            render={({ field }) => (
                              <Input 
                                label="Data de Nascimento *" 
                                {...field} 
                                onChange={(e) => field.onChange(maskDate(e.target.value))}
                                placeholder="DD/MM/AAAA"
                                error={errors.children?.[index]?.birthDate?.message}
                              />
                            )}
                          />
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-primary">Congrega atualmente conosco? *</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 text-sm">
                                <input type="radio" value="Sim" {...register(`children.${index}.congregates`)} /> Sim
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="radio" value="Não" {...register(`children.${index}.congregates`)} /> Não
                              </label>
                            </div>
                            {errors.children?.[index]?.congregates && <p className="text-xs text-red-500">{errors.children[index].congregates.message}</p>}
                          </div>
                        </div>

                        {watchChildren?.[index]?.congregates === 'Sim' && isAdminOrSecretary && (
                          <div className="pt-2 space-y-2">
                            <label className="text-xs font-bold text-primary uppercase">Departamento Atual (Admin/Sec Only)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {CHILD_DEPARTMENTS.map(dept => (
                                <label key={dept} className="flex items-center gap-2 text-xs p-2 bg-white rounded border border-muted/10">
                                  <input type="checkbox" value={dept} {...register(`children.${index}.departments`)} className="w-3 h-3" />
                                  {dept}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card title="3 - Endereço">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-primary">CEP *</label>
                  <input 
                    {...register('cep')}
                    onChange={handleCEPChange}
                    placeholder="00000-000"
                    className="flex h-10 w-full rounded-md border border-muted/30 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {(errors.cep || cepError) && <p className="text-xs text-red-500">{errors.cep?.message || cepError}</p>}
                </div>
                <Input label="Endereço *" {...register('address')} error={errors.address?.message} />
                <Input label="Número *" {...register('number')} error={errors.number?.message} />
                <Input label="Complemento" {...register('complement')} />
                <Input label="Bairro *" {...register('neighborhood')} error={errors.neighborhood?.message} />
                <Input label="Cidade *" {...register('city')} error={errors.city?.message} />
                <Input label="UF *" {...register('state')} error={errors.state?.message} />
              </div>
            </Card>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card title="4 - Contato">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="cell"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        label="Telefone WhatsApp *" 
                        {...field} 
                        onChange={(e) => field.onChange(maskPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        error={errors.cell?.message}
                      />
                    )}
                  />
                  <Input label="E-mail" type="email" {...register('email')} error={errors.email?.message} />
                </div>

                <div className="space-y-4 pt-4 border-t border-muted/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-primary">Outros Telefones</h4>
                    <Button type="button" size="sm" variant="outline" onClick={() => appendPhone({ number: '' })}>
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Telefone
                    </Button>
                  </div>

                  {phoneFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Controller
                          name={`phones.${index}.number`}
                          control={control}
                          render={({ field }) => (
                            <Input 
                              label={`Telefone ${index + 2}`} 
                              {...field} 
                              onChange={(e) => field.onChange(maskPhone(e.target.value))}
                              placeholder="(00) 00000-0000"
                            />
                          )}
                        />
                      </div>
                      <Button type="button" variant="ghost" className="text-rose-500 mb-1" onClick={() => removePhone(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card title="5 - Informações Profissionais">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-primary">Escolaridade</label>
                  <select 
                    {...register('education')}
                    className="w-full h-10 px-3 rounded-md border border-muted/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">Selecione...</option>
                    <option value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</option>
                    <option value="Ensino Fundamental Completo">Ensino Fundamental Completo</option>
                    <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                    <option value="Ensino Médio Completo (ou colegial)">Ensino Médio Completo (ou colegial)</option>
                    <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                    <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                  </select>
                </div>
                <Input label="Profissão" {...register('profession')} />
              </div>
            </Card>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card title="6 - Informações Espirituais">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-primary">Batizado nas Águas? *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" value="Sim" {...register('isBaptized')} /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" value="Não" {...register('isBaptized')} /> Não
                      </label>
                    </div>
                  </div>
                  {isBaptized === 'Sim' && (
                    <>
                      <Input label="Igreja que foi batizada" {...register('baptismChurch')} />
                      <Controller
                        name="baptismDate"
                        control={control}
                        render={({ field }) => (
                          <Input 
                            label="Data de Batismo * (Mês/Ano)" 
                            {...field} 
                            onChange={(e) => field.onChange(maskMonthYear(e.target.value))}
                            placeholder="MM/AAAA"
                          />
                        )}
                      />
                    </>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-primary">Batizado no Espírito Santo? *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" value="Sim" {...register('isHolySpiritBaptized')} /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" value="Não" {...register('isHolySpiritBaptized')} /> Não
                      </label>
                    </div>
                  </div>
                  <Controller
                    name="entryDate"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        label="Ano que entrou na ADFC *" 
                        {...field} 
                        onChange={(e) => field.onChange(maskYear(e.target.value))}
                        placeholder="AAAA"
                        error={errors.entryDate?.message}
                      />
                    )}
                  />
                  <Input label="Igreja antes da ADFC" {...register('previousChurch')} />
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-primary">Participa de alguma convenção?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" value="Sim" {...register('participatesInConvention')} /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" value="Não" {...register('participatesInConvention')} /> Não
                      </label>
                    </div>
                  </div>
                  {participatesInConvention === 'Sim' && <Input label="Qual?" {...register('conventionName')} />}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 7 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card title="7 - Evolução Ministerial">
              <div className="space-y-6">
                {/* Summary for Member */}
                {!isAdminOrSecretary && (
                  <div className="space-y-6">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-700">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                      <p className="text-xs font-medium">Esta seção é de preenchimento exclusivo da Secretaria ou Administrador. Seus dados atuais estão visíveis abaixo apenas para conferência.</p>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted uppercase font-bold">Cargo Atual</p>
                          <p className="text-sm font-bold text-primary">{watch('currentPosition')}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted uppercase font-bold">Departamentos</p>
                          <p className="text-sm font-bold text-primary">
                            {watch('departments')?.length > 0 ? watch('departments').join(', ') : 'Nenhum'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted uppercase font-bold">Tempo no Cargo</p>
                          <p className="text-sm font-bold text-primary">
                            {(() => {
                              const startStr = watch('positionStartDate');
                              if (!startStr) return 'N/A';
                              const start = new Date(startStr);
                              const now = new Date();
                              const diffTime = Math.abs(now.getTime() - start.getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              const years = Math.floor(diffDays / 365);
                              const months = Math.floor((diffDays % 365) / 30);
                              return `${years} anos e ${months} meses`;
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-muted/5">
                      <h5 className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3" /> Histórico Ministerial
                      </h5>
                      <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted/10">
                        {watch('ministerialHistory')?.length > 0 ? (
                          watch('ministerialHistory').map((event: any) => (
                            <div key={event.id} className="relative">
                              <div className="absolute -left-[13px] top-1.5 w-3 h-3 rounded-full bg-secondary border-2 border-white shadow-sm" />
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-primary">
                                    📅 {new Date(event.date).getFullYear()}
                                  </span>
                                  <span className="text-[10px] text-muted font-mono">{event.date}</span>
                                </div>
                                <p className="text-sm text-primary font-medium">{event.description}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted italic">Nenhum histórico registrado.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Edit Form */}
                {isAdminOrSecretary && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-primary">Recebido como</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="radio" value="MEMBRO" {...register('receivedAs')} /> Membro
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="radio" value="CONGREGADO" {...register('receivedAs')} /> Congregado
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-primary">Cargo Atual</label>
                        <select 
                          {...register('currentPosition')}
                          className="w-full p-2 rounded border border-muted/20 text-sm bg-white h-10"
                        >
                          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-primary">Data de Início no Cargo</label>
                        <input 
                          type="date" 
                          {...register('positionStartDate')}
                          className="w-full p-2 rounded border border-muted/20 text-sm h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-primary">Departamento Atual (Múltipla escolha)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {DEPARTMENTS.map(dept => (
                          <label key={dept} className="flex items-center gap-2 text-xs p-2 bg-background/50 rounded border border-muted/10">
                            <input type="checkbox" value={dept} {...register('departments')} className="w-3 h-3" />
                            {dept}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-muted/5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-primary">Consagrado a:</label>
                        <select
                          {...register('consecratedTo')}
                          className="flex h-10 w-full rounded-md border border-muted/30 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">Selecione...</option>
                          {CONSECRATIONS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-primary">Data da Consagração</label>
                        <input 
                          type="date" 
                          {...register('consecrationDate')}
                          className="w-full p-2 rounded border border-muted/20 text-sm h-10"
                        />
                      </div>
                    </div>

                    {/* History Management for Admin */}
                    <div className="space-y-4 pt-4 border-t border-muted/5">
                      <h5 className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3" /> Histórico Ministerial
                      </h5>
                      <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted/10">
                        {watch('ministerialHistory')?.map((event: any) => (
                          <div key={event.id} className="relative">
                            <div className="absolute -left-[13px] top-1.5 w-3 h-3 rounded-full bg-secondary border-2 border-white shadow-sm" />
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-primary">
                                  📅 {new Date(event.date).getFullYear()}
                                </span>
                                <span className="text-[10px] text-muted font-mono">{event.date}</span>
                              </div>
                              <p className="text-sm text-primary font-medium">{event.description}</p>
                              <p className="text-[10px] text-muted">Registrado por: {event.registeredBy}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {step === 8 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card title="8 - Anexar Arquivo de Foto 3x3">
              <div className="space-y-6">
                <Controller
                  name="photoUrl"
                  control={control}
                  render={({ field }) => {
                    const fileInputRef = React.useRef<HTMLInputElement>(null);
                    
                    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      if (file.size > 2 * 1024 * 1024) {
                        showToast('A imagem deve ter no máximo 2MB.', 'error');
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        field.onChange(reader.result as string);
                        showToast('Foto anexada com sucesso!', 'success');
                      };
                      reader.readAsDataURL(file);
                    };

                    const triggerFileInput = () => {
                      fileInputRef.current?.click();
                    };

                    const removePhoto = () => {
                      field.onChange('');
                      showToast('Foto removida.', 'success');
                    };

                    return (
                      <div className="space-y-4">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        
                        {field.value ? (
                          <div className="flex flex-col items-center justify-center p-6 border border-muted/15 rounded-xl bg-background/30 gap-4">
                            <div className="w-40 h-40 rounded-xl border border-muted/20 overflow-hidden shadow-md bg-white flex items-center justify-center">
                              <img src={field.value} alt="Foto do Membro" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={triggerFileInput}>
                                Alterar Foto
                              </Button>
                              <Button type="button" size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={removePhoto}>
                                Remover Foto
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={triggerFileInput}
                            className="border-2 border-dashed border-muted/30 rounded-xl p-10 text-center hover:border-primary transition-all cursor-pointer bg-background/20 group"
                          >
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                              <Camera className="w-8 h-8" />
                            </div>
                            <p className="text-primary font-bold">Clique para anexar sua foto 3x3</p>
                            <p className="text-xs text-muted mt-2">Formatos aceitos: JPG, PNG (Máx 2MB)</p>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                <div className="bg-primary/5 rounded-xl p-6 border border-primary/10 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold mb-2">
                    <InfoIcon className="w-5 h-5" />
                    <span>Instruções para a Foto</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                    <div className="space-y-3">
                      <p className="font-bold text-primary uppercase tracking-wider">Enquadramento e Postura</p>
                      <ul className="list-disc pl-4 space-y-1 text-muted">
                        <li>Formato: Vertical (3x3 cm).</li>
                        <li>Posição: De frente para a câmera.</li>
                        <li>Rosto: Deve ocupar 70% a 80% da foto.</li>
                        <li>Expressão: Neutra ou Sorrindo.</li>
                        <li>Olhos: Abertos e visíveis.</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <p className="font-bold text-primary uppercase tracking-wider">Vestimenta e Dicas</p>
                      <ul className="list-disc pl-4 space-y-1 text-muted">
                        <li>Evite roupas brancas (fundo branco).</li>
                        <li>Sem acessórios grandes que cubram o rosto.</li>
                        <li>Óculos: Sem reflexo nas lentes.</li>
                        <li>Fundo: Boa luminosidade.</li>
                        <li>Cabelo: Não deve cobrir os olhos.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-muted/10">
          <Button type="button" variant="outline" onClick={prevStep} disabled={step === 1}>
            Anterior
          </Button>
          
          <div className="flex flex-col items-end gap-2">
            {step === totalSteps ? (
              <div className="flex flex-col items-end gap-4">
                <p className="text-[10px] text-muted max-w-[300px] text-right italic">
                  “Ao atualizar seus dados, você confirma que as informações são verdadeiras e estão de acordo com nossa Política de Privacidade.”
                </p>
                <Button 
                  type="submit" 
                  variant="secondary" 
                  size="lg" 
                  className="px-12"
                  disabled={isSubmittingForm}
                >
                  {isSubmittingForm ? 'Salvando...' : 'Salvar Cadastro'}
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={nextStep}>
                Próximo Passo
              </Button>
            )}
          </div>
        </div>
      </form>

      <footer className="mt-12 pt-8 border-t border-muted/10 text-center">
        <div className="flex justify-center gap-4 text-xs text-muted">
          <button type="button" className="hover:text-primary transition-colors">Política de Privacidade</button>
          <span className="text-muted/30">|</span>
          <button type="button" className="hover:text-primary transition-colors">Termo de Uso</button>
        </div>
      </footer>
    </div>
  );
};

