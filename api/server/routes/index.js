const accessPermissions = require('./accessPermissions');
const assistants = require('./assistants');
const categories = require('./categories');
const tokenizer = require('./tokenizer');
const endpoints = require('./endpoints');
const staticRoute = require('./static');
const messages = require('./messages');
const memories = require('./memories');
const presets = require('./presets');
const prompts = require('./prompts');
const balance = require('./balance');
const plugins = require('./plugins');
const actions = require('./actions');
const banner = require('./banner');
const search = require('./search');
const models = require('./models');
const convos = require('./convos');
const config = require('./config');
// const agents = require('./agents');
const roles = require('./roles');
const oauth = require('./oauth');
const files = require('./files');
const share = require('./share');
const tags = require('./tags');
const auth = require('./auth');
const billing = require('./billing');
const edit = require('./edit');
const keys = require('./keys');
const user = require('./user');
const mcp = require('./mcp');
const admin = require('./admin');
// const aiServices = require('./aiServices');  // Temporarily disabled - fixing middleware loading

module.exports = {
  admin,
  // aiServices,  // Temporarily disabled - fixing middleware loading
  mcp,
  edit,
  auth,
  billing,
  keys,
  user,
  tags,
  roles,
  oauth,
  files,
  share,
  banner,
  // agents,
  convos,
  search,
  config,
  models,
  prompts,
  categories,
  tokenizer,
  endpoints,
  staticRoute,
  messages,
  memories,
  presets,
  balance,
  plugins,
  actions,
  accessPermissions,
};
