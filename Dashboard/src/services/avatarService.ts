class AvatarService {
  private static instance: AvatarService;
  private avatarPath: string = '/models/model_full.glb'; // Default avatar path

  private constructor() {}

  public static getInstance(): AvatarService {
    if (!AvatarService.instance) {
      AvatarService.instance = new AvatarService();
    }
    return AvatarService.instance;
  }

  public getAvatarPath(): string {
    return this.avatarPath;
  }

  public setAvatarPath(path: string): void {
    this.avatarPath = path;
  }

  public resetToDefault(): void {
    this.avatarPath = '/models/model_full.glb';
  }
}

export const avatarService = AvatarService.getInstance(); 