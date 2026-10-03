"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgramsService = void 0;
class ProgramsService {
    constructor(persistence) {
        this.persistence = persistence;
    }
    async getPrograms(filters) {
        // Pass filters to the persistence layer
        return await this.persistence.getPrograms(filters);
    }
    async getProgramById(id) {
        const program = await this.persistence.getProgram(id);
        return program ?? null;
    }
    async createProgram(programData) {
        // Generate ID if not provided
        const id = ('id' in programData && programData.id !== undefined && programData.id !== '')
            ? programData.id
            : `program-${Date.now()}`;
        const now = new Date().toISOString();
        const program = {
            id,
            title: programData.title,
            description: programData.description,
            host: programData.host,
            format: programData.format,
            defaultDurationMin: programData.defaultDurationMin,
            editorialStyle: programData.editorialStyle,
            scenario: programData.scenario,
            cameras: programData.cameras ?? [],
            standardStructure: programData.standardStructure ?? [],
            defaultOpening: programData.defaultOpening ?? '',
            defaultClosing: programData.defaultClosing ?? '',
            createdAt: ('createdAt' in programData && programData.createdAt !== undefined)
                ? programData.createdAt
                : now,
            updatedAt: ('updatedAt' in programData && programData.updatedAt !== undefined)
                ? programData.updatedAt
                : now
        };
        return await this.persistence.saveProgram(program);
    }
    async updateProgram(id, programData) {
        // First get the existing program
        const existingProgram = await this.persistence.getProgram(id);
        if (!existingProgram) {
            return null;
        }
        // Merge the data
        const updatedProgram = {
            ...existingProgram,
            ...programData,
            updatedAt: new Date().toISOString() // Always update the timestamp
        };
        return await this.persistence.saveProgram(updatedProgram);
    }
    async deleteProgram(id) {
        return await this.persistence.deleteProgram(id);
    }
}
exports.ProgramsService = ProgramsService;
