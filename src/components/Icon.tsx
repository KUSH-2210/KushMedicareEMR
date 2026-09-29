type IconName = 'home' | 'patients' | 'plus' | 'search' | 'menu' | 'logout' | 'user' | 'arrow' | 'calendar' | 'clipboard' | 'medicine' | 'syringe' | 'flask' | 'bill' | 'template' | 'chart' | 'settings' | 'clock' | 'file'

const paths: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z',
  patients: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m0-7.26a4 4 0 0 1 0 7.75',
  plus: 'M12 5v14m-7-7h14',
  search: 'm21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  user: 'M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  arrow: 'm9 18 6-6-6-6',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  clipboard: 'M9 5H6a2 2 0 0 0-2 2v13h16V7a2 2 0 0 0-2-2h-3M9 3h6v4H9V3Zm0 9h6m-6 4h6',
  medicine: 'm10 4-6 6a5 5 0 0 0 7 7l6-6a5 5 0 0 0-7-7Zm-2 4 7 7',
  syringe: 'm18 2 4 4m-2-2-8.5 8.5m-2-6 8 8M5 10l9 9m-7-7-4 4a3 3 0 0 0 4 4l4-4M3 21l3-3',
  flask: 'M9 3h6m-1 0v6l5 9a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l5-9V3m-3 12h10',
  bill: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h4',
  template: 'M4 4h16v16H4V4Zm4 0v16m4-12h5m-5 4h5m-5 4h3',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.5 1.5m-9 9L6 18m12 0-1.5-1.5m-9-9L6 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2',
  file: 'M6 2h8l4 4v16H6V2Zm8 0v5h4m-8 5h4m-4 4h4',
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
