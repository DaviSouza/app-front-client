export type GeneroCliente = 'M' | 'F' | 'OUTRO'

export type Cliente = {
  id: string
  nome: string
  email: string
  login: string
  data_nascimento: string // ISO yyyy-mm-dd
  genero: GeneroCliente
  senha: string
}

/** `senha` opcional: omita ou deixe vazio para manter a senha atual. */
export type ClienteUpdate = Omit<Cliente, 'id' | 'senha'> & {
  senha?: string
}

