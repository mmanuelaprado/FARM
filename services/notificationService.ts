
class NotificationService {
  private lastNotificationTime: number = 0;
  private throttleMs: number = 30000; // Evita notificações repetitivas em menos de 30s

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("Este navegador não suporta notificações de desktop");
      return false;
    }

    if (Notification.permission === "granted") return true;

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  sendHarvestReady(cropName: string, icon: string) {
    const now = Date.now();
    if (now - this.lastNotificationTime < this.throttleMs) return;

    if (Notification.permission === "granted") {
      this.lastNotificationTime = now;
      new Notification("Gemini Harvest", {
        body: `Sua colheita de ${cropName} ${icon} está pronta!`,
        icon: "https://cdn-icons-png.flaticon.com/512/888/888144.png", // Ícone genérico de fazenda
        tag: 'harvest-ready'
      });
    }
  }
}

export const notificationService = new NotificationService();
