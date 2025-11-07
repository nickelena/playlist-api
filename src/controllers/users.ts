import type { Request, Response, NextFunction } from 'express';
import db from '../db/connection.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { User, CreateUser } from '../types/models.js';

// Get all users
export function getAllUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
    res.json(users);
  } catch (error) {
    next(error);
  }
}

// Get user by ID
export function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

// Create new user
export function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email }: CreateUser = req.body;

    if (!name || !email) {
      throw new ApiError(400, 'Name and email are required');
    }

    // Check if email already exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      throw new ApiError(409, 'Email already exists');
    }

    const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');

    const result = insert.run(name, email);
    const userId = result.lastInsertRowid;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

// Update user
export function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if email is being changed to an existing email
    if (email) {
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ? AND id != ?').get(email, id);
      if (existingUser) {
        throw new ApiError(409, 'Email already exists');
      }
    }

    const update = db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email)
      WHERE id = ?
    `);

    update.run(name, email, id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
}

// Delete user
export function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
