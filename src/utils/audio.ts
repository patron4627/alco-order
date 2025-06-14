import { useEffect } from 'react'

let notificationSound: HTMLAudioElement | null = null

export const playNotificationSound = () => {
  if (!notificationSound) {
    notificationSound = new Audio('/sounds/notification.mp3')
  }
  notificationSound.play().catch((error) => {
    console.error('Fehler beim Abspielen des Sounds:', error)
  })
}

export const useAudioUnlock = () => {
  useEffect(() => {
    const unlockAudio = () => {
      if (notificationSound) {
        notificationSound.play().catch(() => {})
        notificationSound.pause()
        notificationSound.currentTime = 0
      }
    }

    document.addEventListener('click', unlockAudio)
    document.addEventListener('touchstart', unlockAudio)

    return () => {
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }
  }, [])
}
