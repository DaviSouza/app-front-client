import type { GeneroCliente } from '@/features/clientes/model/cliente'

export type ClienteRegisterValues = {
  nome: string
  email: string
  login: string
  data_nascimento: string
  genero: GeneroCliente
  senha: string
}

export const emptyClienteRegisterValues: ClienteRegisterValues = {
  nome: '',
  email: '',
  login: '',
  data_nascimento: '',
  genero: 'OUTRO',
  senha: '',
}

export function isClienteRegisterValid(values: ClienteRegisterValues): boolean {
  return Boolean(
    values.nome.trim() &&
      values.email.trim() &&
      values.login.trim() &&
      values.data_nascimento.trim() &&
      values.genero &&
      values.senha.trim(),
  )
}
