"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const programs_service_1 = require("./src/services/programs/programs.service");
const supabasePersistence_1 = require("./src/server/supabasePersistence");
// This is just to verify that the modules can be loaded and instantiated
console.log('Service classes imported successfully');
// We won't actually instantiate them because they require Supabase connection
// but we can verify the class structure
console.log('ProgramsService methods:', Object.getOwnPropertyNames(programs_service_1.ProgramsService.prototype));
console.log('SupabasePersistence methods:', Object.getOwnPropertyNames(supabasePersistence_1.SupabasePersistence.prototype));
