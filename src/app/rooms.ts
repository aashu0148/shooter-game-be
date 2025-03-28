import { Bug, Bullet, Position, Room, RoomPlayer } from "@utils/types";

const MAX_ROOM_PLAYERS = 4;
export default class RoomManager {
  private static _instance: RoomManager | null = null;
  private rooms: Room[] = [];

  constructor() {
    if (RoomManager._instance) return RoomManager._instance;
    RoomManager._instance = this;
  }

  // Create a new room
  createRoom(roomId: string, player: RoomPlayer, maxBugs: number = 30): Room {
    const room: Room = {
      id: roomId,
      bugs: [],
      players: [player],
      createdAt: new Date(),
      updatedAt: new Date(),
      maxBugs,
      score: 0,
      status: "playing",
    };
    this.rooms.push(room);
    return room;
  }

  // Add player to room
  addPlayerToRoom(roomId: string, player: RoomPlayer): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");
    if (room.players.length >= MAX_ROOM_PLAYERS)
      throw new Error("Room is full");
    if (room.players.find((p) => p.id === player.id)) return room;

    room.players.push({
      ...player,
      lastActiveAt: new Date(),
      bullets: [],
    });
    room.updatedAt = new Date();
    return room;
  }

  // Remove player from room
  removePlayerFromRoom(roomId: string, playerId: string): Room | null {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    room.players = room.players.filter((p) => p.id !== playerId);
    room.updatedAt = new Date();

    // Clean up empty rooms
    if (room.players.length === 0) {
      this.deleteRoom(roomId);
      return null;
    }

    return room;
  }

  // Find room by id
  findRoom(roomId: string): Room | undefined {
    return this.rooms.find((room) => room.id === roomId);
  }

  // Delete room
  private deleteRoom(roomId: string): void {
    this.rooms = this.rooms.filter((room) => room.id !== roomId);
  }

  // Clean up inactive rooms (can be called periodically)
  cleanupInactiveRooms(maxInactiveTime: number = 1800000): void {
    // default 30 minutes
    const now = new Date();
    this.rooms = this.rooms.filter((room) => {
      const inactive =
        now.getTime() - room.updatedAt.getTime() > maxInactiveTime;
      return !inactive;
    });
  }

  // Get all rooms
  getAllRooms(): Room[] {
    return this.rooms;
  }

  // Add a new bug to room
  addBugToRoom(roomId: string, bug: Bug): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    if (room.bugs.length >= room.maxBugs) return room;

    room.bugs.push(bug);
    room.updatedAt = new Date();
    return room;
  }

  // Remove a bug from room and update score
  removeBugFromRoom(roomId: string, bugId: string): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    // Find the bug to get its level before removing it
    const killedBug = room.bugs.find((bug) => bug.id === bugId);
    if (killedBug) {
      // Update score based on bug level (1-4 points)
      room.score = (room.score || 0) + killedBug.level;
    }

    room.bugs = room.bugs.filter((bug) => bug.id !== bugId);
    room.updatedAt = new Date();
    return room;
  }

  // Update bug health in room
  updateBugHealth(roomId: string, bugId: string, newHealth: number): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    room.bugs = room.bugs.map((bug) => {
      if (bug.id === bugId) {
        return { ...bug, health: newHealth };
      }
      return bug;
    });
    room.updatedAt = new Date();
    return room;
  }

  // Update player position in room
  updatePlayerPosition(
    roomId: string,
    playerId: string,
    position: Position
  ): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found in room");

    player.position = position;
    room.updatedAt = new Date();
    return room;
  }

  // Add a bullet to a player's bullets array
  addBulletToPlayer(roomId: string, playerId: string, bullet: Bullet): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return room;

    player.bullets = player.bullets || [];
    player.bullets.push(bullet);
    room.updatedAt = new Date();
    return room;
  }

  // Update all bullets for a player
  updatePlayerBullets(
    roomId: string,
    playerId: string,
    bullets: Bullet[]
  ): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return room;

    player.bullets = bullets;
    room.updatedAt = new Date();
    return room;
  }

  // Set room status
  setRoomStatus(roomId: string, status: "playing" | "over"): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    room.status = status;
    room.updatedAt = new Date();
    return room;
  }

  // Restart room
  restartRoom(roomId: string): Room {
    const room = this.findRoom(roomId);
    if (!room) throw new Error("Room not found");

    room.status = "playing";
    room.score = 0;
    room.bugs = [];
    room.players = room.players.map((player) => ({
      ...player,
      bullets: [],
    }));
    room.updatedAt = new Date();
    return room;
  }
}
