import type { PhotoRef } from '@/domain/types'

/**
 * Biblioteca de partida do Songe: doze paisagens de inverno europeu com
 * licença livre, para que o app já nasça bonito antes de existir uma única
 * foto de vocês. Nenhuma imagem de pessoas. Some da lista assim que vocês
 * subirem as suas — é só um ponto de partida, não uma decoração permanente.
 */
export interface LibraryPhoto extends PhotoRef {
  title: string
  thumb: string
  /** Miniatura de 20px embutida: preenche o espaço antes da foto chegar. */
  lqip: string
  sourceUrl: string
}

const RAW_LIBRARY = [
  {
    id: 'vila-no-lago',
    title: 'Vila no lago',
    src: '/photos/vila-no-lago.webp',
    thumb: '/photos/vila-no-lago@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRlwAAABXRUJQVlA4IFAAAACwAwCdASoUAA0APu1kqk4ppaQiMAgBMB2JYwCdACIe2Ca6Hf/cFAD+Zl5nuvjvTCsHqjmrfOaFOmuQZ6WnVLgf5W64IHD2kXZ2Nw15TUAAAA==',
    focalX: 0.5,
    focalY: 0.5,
    credit: 'fabsit · BY-SA 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/126875359@N03/41167763831',
  },
  {
    id: 'luzes-na-montanha',
    title: 'Luzes na montanha',
    src: '/photos/luzes-na-montanha.webp',
    thumb: '/photos/luzes-na-montanha@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADwAwCdASoUAAsAPu1mqk2ppaQiMAgBMB2JZwDImBTsg47hPeGtUvAAAP7o78rUGbmF0GH6VKHPNTG8EqrKBBCZt7eRsNOtAAA=',
    focalX: 0.5,
    focalY: 0.55,
    credit: 'fabsit · BY-SA 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/126875359@N03/32484506160',
  },
  {
    id: 'praca-ao-anoitecer',
    title: 'Praça ao anoitecer',
    src: '/photos/praca-ao-anoitecer.webp',
    thumb: '/photos/praca-ao-anoitecer@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAADwAwCdASoUAA0APu1iqU2ppaOiMAgBMB2JbACdH8ADAxQ6DCJGRC4AAP5wyfU7Eei+remMFKZ/WfcjbkG641fZrR9tiHqfLglauoa/dUGy3LOyfMAAAA==',
    focalX: 0.5,
    focalY: 0.55,
    credit: 'Jorge Lascar · BY 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/8721758@N06/8675058438',
  },
  {
    id: 'cafe-da-esquina',
    title: 'Café da esquina',
    src: '/photos/cafe-da-esquina.webp',
    thumb: '/photos/cafe-da-esquina@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAABQBACdASoUAA0APu1kqU4ppaOiMAgBMB2JZACdMoMrZEmUwfYAutN3mugAAP6hcEPLT7Nyg1nRKZpDM2T1v0xahieA0g3n8nI+OP5LeXtueFo7aAEK2zOyLwncXH+z39tIAAAA',
    focalX: 0.5,
    focalY: 0.5,
    credit: 'Mike GL · BY 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/49481211@N08/5276348140',
  },
  {
    id: 'picos-ao-entardecer',
    title: 'Picos ao entardecer',
    src: '/photos/picos-ao-entardecer.webp',
    thumb: '/photos/picos-ao-entardecer@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAACQAwCdASoUAA0APu1iqk2ppaQiMAgBMB2JQBOgAfGVazLYBSsAAJLDJwTAMhYe6xTuPo3YA87loQi6T6UiBdzlyHBlBIOMEoAAAA==',
    focalX: 0.5,
    focalY: 0.55,
    credit: '*rboed* · BY 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/92082510@N04/16564912047',
  },
  {
    id: 'mar-de-nuvens',
    title: 'Mar de nuvens',
    src: '/photos/mar-de-nuvens.webp',
    thumb: '/photos/mar-de-nuvens@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAAAQBACdASoUAA0APu1iqU2ppaQiMAgBMB2JZgCdIExDBnJ/NLNxjcK1OAD+36UtO4uUd9ezORKi1hoNoySL5T1s8T0PlwbIzcAIn9/CPEovhHIAbAs+2Rd4AAA=',
    focalX: 0.5,
    focalY: 0.5,
    credit: 'skyseeker · BY 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/40422902@N00/15012012864',
  },
  {
    id: 'bosque-em-silencio',
    title: 'Bosque em silêncio',
    src: '/photos/bosque-em-silencio.webp',
    thumb: '/photos/bosque-em-silencio@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAACQAwCdASoUAAsAPu1Ct1apoqakGAEwHYllAMKAHgPAZfpo1RAAAP32kVbaG6ENYULKRQh+aWUm0Mw66Y8J3Xlwn08WgAAA',
    focalX: 0.5,
    focalY: 0.5,
    credit: 'PokemonaDeChroma · BY-SA 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/142409708@N08/32388185326',
  },
  {
    id: 'trilha-de-pinheiros',
    title: 'Trilha de pinheiros',
    src: '/photos/trilha-de-pinheiros.webp',
    thumb: '/photos/trilha-de-pinheiros@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAADwAwCdASoUAA0APu1kqk4ppaQiMAgBMB2JYwC7IKnCqdWer02A3eQAAP7xEjzRg2RjO6+hR7IHRAYCJUYzjHgYMXTUEImkPB+fOE2b0IDtfGWUBXy7n5zeiGNR+zGrrgAAAA==',
    focalX: 0.5,
    focalY: 0.5,
    credit: 'Groman123 · BY-SA 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/85203634@N05/16240806076',
  },
  {
    id: 'trem-na-neve',
    title: 'Trem na neve',
    src: '/photos/trem-na-neve.webp',
    thumb: '/photos/trem-na-neve@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAABwAwCdASoUAA0APu1iqk4ppaQiMAgBMB2JYwCdAA4N/VW2SgAA+4yEmtCLEpYqk6ObTXVtzUq8kVXIHtiRtTMh8FRW+gAA',
    focalX: 0.45,
    focalY: 0.5,
    credit: 'Kecko · BY 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/70981241@N00/32028826130',
  },
  {
    id: 'telhados-nevados',
    title: 'Telhados nevados',
    src: '/photos/telhados-nevados.webp',
    thumb: '/photos/telhados-nevados@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRl4AAABXRUJQVlA4IFIAAACQAwCdASoUAA0APu1iqk4ppaQiMAgBMB2JYwCdABe0AoKntnDAAMs0R+DJtkhmtHhtUK+QQU0HLIW62P410631r+ADx22P9I9qoVgrQOjDAAAA',
    focalX: 0.5,
    focalY: 0.5,
    credit: 'Drew de F Fawkes · BY 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/157106216@N08/52538846134',
  },
  {
    id: 'rua-na-chuva',
    title: 'Rua na chuva',
    src: '/photos/rua-na-chuva.webp',
    thumb: '/photos/rua-na-chuva@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAAAwBACdASoUAA8APu1iqk4ppaQiMAgBMB2JaQAAV/3KUH5pN8dDmuN3cAAA/ufZETEM5sW04OpXp0NFoupSm8lb5w1BedK+UZyJkgf0isY+6XobOsAM253mjFwivgOhd4AAAA==',
    focalX: 0.5,
    focalY: 0.5,
    credit: 'Nick Page Photos · BY 2.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/27506472@N04/6543038247',
  },
  {
    id: 'lago-em-nevoa',
    title: 'Lago em névoa',
    src: '/photos/lago-em-nevoa.webp',
    thumb: '/photos/lago-em-nevoa@sm.webp',
    lqip:
      'data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADQAwCdASoUAAwAPu1oqk6ppiQiMAgBMB2JYwCdACHekCzuT7sUDnAA/d4VMzI2I4IYNqoUahMv3LxnGlg97mBcdLDQAA==',
    focalX: 0.5,
    focalY: 0.5,
    credit: 'Bernard Spragg · CC0 1.0 · via www.flickr.com',
    sourceUrl: 'https://www.flickr.com/photos/88123769@N02/17717782294',
  },
] as const

export const PHOTO_LIBRARY: LibraryPhoto[] = RAW_LIBRARY.map((photo) => ({
  ...photo,
  kind: 'preset' as const,
}))

export function findLibraryPhoto(id: string): LibraryPhoto | undefined {
  return PHOTO_LIBRARY.find((photo) => photo.id === id)
}
