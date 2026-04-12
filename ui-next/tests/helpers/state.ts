/**
 * State Management Helper
 * Stores shared IDs across test suites
 */
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = 'tests/.state.json';

interface TestState {
  infrastructureId?: string;
  infrastructureName?: string;
  catalogId?: string;
  catalogName?: string;
  softwareId?: string;
  softwareDomain?: string;
  tfstateVariableId?: string;
  projectVariableId?: string;
  [key: string]: any;
}

class StateManager {
  private state: TestState = {};

  constructor() {
    this.load();
  }

  load() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        this.state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      } catch (error) {
        console.warn('Warning: Could not load state file', error);
        this.state = {};
      }
    }
  }

  save() {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  set(key: string, value: any) {
    this.state[key] = value;
    this.save();
  }

  get(key: string): any {
    this.load();
    return this.state[key];
  }

  getAll(): TestState {
    return this.state;
  }

  clear() {
    this.state = {};
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
    }
  }
}

export const state = new StateManager();
