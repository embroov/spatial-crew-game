import type { MapWall, MapRoomZone, Position } from '../types/game';

export class GameMap {
  // Expanded Huge Social Plaza Map Dimensions
  public static readonly MAP_WIDTH = 4000;
  public static readonly MAP_HEIGHT = 2800;
  
  // Clear open floor spawn in Grand Cyber Plaza
  public static readonly SPAWN_POS: Position = { x: 2000, y: 1180 };

  // Social Zones across the Cyber Plaza & Lounge
  public static readonly ROOMS: MapRoomZone[] = [
    { name: 'Grand Cyber Plaza', x: 1500, y: 1000, width: 1000, height: 800, color: 'rgba(59, 130, 246, 0.14)' },
    { name: 'VIP Lounge & Bar', x: 300, y: 200, width: 1000, height: 700, color: 'rgba(168, 85, 247, 0.14)' },
    { name: 'Rooftop Observatory', x: 2700, y: 200, width: 1000, height: 700, color: 'rgba(14, 165, 233, 0.14)' },
    { name: 'DJ Music Stage', x: 200, y: 1100, width: 1000, height: 800, color: 'rgba(236, 72, 153, 0.14)' },
    { name: 'Arcade & Neon Zone', x: 2800, y: 1100, width: 1000, height: 800, color: 'rgba(34, 197, 94, 0.14)' },
    { name: 'Acoustic Chat Pods', x: 300, y: 2000, width: 1100, height: 650, color: 'rgba(249, 115, 22, 0.14)' },
    { name: 'Sunset Terrace Café', x: 2600, y: 2000, width: 1100, height: 650, color: 'rgba(234, 179, 8, 0.14)' },
    { name: 'Courtyard Promenade', x: 1500, y: 1950, width: 1000, height: 700, color: 'rgba(99, 102, 241, 0.14)' },
  ];

  // Outer boundaries & social zone partition walls (with wide open doorways)
  public static readonly WALLS: MapWall[] = [
    // Outer Bounding Border
    { x: 0, y: 0, width: 4000, height: 50 },
    { x: 0, y: 2750, width: 4000, height: 50 },
    { x: 0, y: 0, width: 50, height: 2800 },
    { x: 3950, y: 0, width: 50, height: 2800 },

    // VIP Lounge Partitions
    { x: 300, y: 900, width: 400, height: 30 },
    { x: 850, y: 900, width: 450, height: 30 },
    { x: 1300, y: 200, width: 30, height: 500 },

    // Observatory Partitions
    { x: 2670, y: 200, width: 30, height: 500 },
    { x: 2700, y: 900, width: 450, height: 30 },
    { x: 3300, y: 900, width: 400, height: 30 },

    // DJ Music Stage Walls
    { x: 200, y: 1100, width: 30, height: 800 },
    { x: 1200, y: 1100, width: 30, height: 300 },
    { x: 1200, y: 1550, width: 30, height: 350 },

    // Arcade & Neon Zone Partitions
    { x: 2770, y: 1100, width: 30, height: 350 },
    { x: 2770, y: 1600, width: 30, height: 300 },

    // Acoustic Chat Pods Walls
    { x: 300, y: 1970, width: 500, height: 30 },
    { x: 950, y: 1970, width: 450, height: 30 },
    { x: 1400, y: 2000, width: 30, height: 650 },

    // Terrace Café Partitions
    { x: 2570, y: 2000, width: 30, height: 650 },
    { x: 2600, y: 1970, width: 450, height: 30 },
    { x: 3200, y: 1970, width: 500, height: 30 },

    // Counters (positioned away from center spawn)
    { x: 600, y: 450, width: 300, height: 80 },
    { x: 3100, y: 450, width: 300, height: 80 },
    { x: 500, y: 1300, width: 250, height: 120 },
  ];

  /**
   * Check if player dot collides with any wall obstacle
   */
  public static checkCollision(x: number, y: number, radius: number = 18): boolean {
    if (x - radius < 60 || x + radius > this.MAP_WIDTH - 60 ||
        y - radius < 60 || y + radius > this.MAP_HEIGHT - 60) {
      return true;
    }

    for (const wall of this.WALLS) {
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const distanceX = x - closestX;
      const distanceY = y - closestY;
      const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

      if (distanceSquared < (radius * radius)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get current room name based on player coordinates
   */
  public static getCurrentRoom(x: number, y: number): string {
    for (const room of this.ROOMS) {
      if (x >= room.x && x <= room.x + room.width &&
          y >= room.y && y <= room.y + room.height) {
        return room.name;
      }
    }
    return 'Plaza Walkway';
  }
}
