import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { usersRouter } from './routes/users.js';
import { musicRouter } from './routes/music.js';
import { discoveryRouter } from './routes/discovery.js';
import { matchesRouter } from './routes/matches.js';
import { messagesRouter } from './routes/messages.js';
import { reportsRouter } from './routes/reports.js';
import { blocksRouter } from './routes/blocks.js';
import { waitlistRouter } from './routes/waitlist.js';
import { authRouter } from './routes/auth.js';

export const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/users', usersRouter);
app.use('/music', musicRouter);
app.use('/discovery', discoveryRouter);
app.use('/matches', matchesRouter);
app.use('/messages', messagesRouter);
app.use('/reports', reportsRouter);
app.use('/blocks', blocksRouter);
app.use('/waitlist', waitlistRouter);
app.use('/auth', authRouter);
