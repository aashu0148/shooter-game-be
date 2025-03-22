export interface RoomPlayer {
  id: string;
  name: string;
  lastActiveAt: Date;
  position: Position;
}

export interface Room {
  id: string;
  players: RoomPlayer[];
  createdAt: Date;
  updatedAt: Date;
  bugs: Bug[];
  maxBugs: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Bullet extends Position {
  active: boolean;
}

export interface Bug extends Position {
  id: string;
  active: boolean;
  level: number;
  health: number;
}
