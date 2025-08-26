// src/services/categoriaService.js
// Service mock para gestión de categorías - Simula backend real

const { Categoria } = require('../domain/tournament/entities/Categoria');

/**
 * Service mock que simula un repositorio de categorías
 * En implementación real se conectaría a DynamoDB o RDS
 */
class CategoriaService {
  constructor() {
    // Datos mock inicializados
    this.categorias = new Map();
    this._inicializarDatosMock();
  }

  /**
   * Obtiene una categoría por su ID
   * @param {string} categoriaId - ID de la categoría
   * @returns {Promise<Categoria|null>} Categoría encontrada o null
   * @throws {Error} Si categoriaId es inválido
   */
  async obtenerPorId(categoriaId) {
    if (!categoriaId || typeof categoriaId !== 'string') {
      throw new Error('categoriaId debe ser un string no vacío');
    }
    try {
      await this._simularLatencia(50);
      const categoria = this.categorias.get(categoriaId);
      return categoria || null;
    } catch (error) {
      throw new Error(`Error al obtener categoría ${categoriaId}: ${error.message}`);
    }
  }

  /**
   * Lista todas las categorías activas
   * @returns {Promise<Array<Categoria>>} Array de categorías activas
   */
  async listarActivas() {
    try {
      await this._simularLatencia(100);
      const categoriasActivas = Array.from(this.categorias.values())
        .filter(categoria => categoria.estaActiva);
      return categoriasActivas;
    } catch (error) {
      throw new Error(`Error al listar categorías activas: ${error.message}`);
    }
  }

  /**
   * Lista todas las categorías (activas e inactivas)
   * @returns {Promise<Array<Categoria>>} Array de todas las categorías
   */
  async listarTodas() {
    try {
      await this._simularLatencia(80);
      return Array.from(this.categorias.values());
    } catch (error) {
      throw new Error(`Error al listar todas las categorías: ${error.message}`);
    }
  }

  /**
   * Crea una nueva categoría
   * @param {Categoria} categoria - Instancia de categoría a guardar
   * @returns {Promise<void>}
   * @throws {Error} Si categoria es inválida
   */
  async guardar(categoria) {
    if (!categoria?.id?.valor || !categoria?.descripcion) {
      throw new Error('Categoría inválida: faltan propiedades requeridas');
    }
    try {
      await this._simularLatencia(150);
      this.categorias.set(categoria.id.valor, categoria);
    } catch (error) {
      throw new Error(`Error al guardar categoría: ${error.message}`);
    }
  }

  /**
   * Verifica si existe una categoría con el ID especificado
   * @param {string} categoriaId - ID de la categoría
   * @returns {Promise<boolean>} True si existe, false caso contrario
   * @throws {Error} Si categoriaId es inválido
   */
  async existe(categoriaId) {
    if (!categoriaId || typeof categoriaId !== 'string') {
      throw new Error('categoriaId debe ser un string no vacío');
    }
    try {
      await this._simularLatencia(30);
      return this.categorias.has(categoriaId);
    } catch (error) {
      throw new Error(`Error al verificar existencia de categoría: ${error.message}`);
    }
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Inicializa datos mock para testing/demo
   * @private
   */
  _inicializarDatosMock() {
    try {
      // Categoría profesional activa
      const profesional = new Categoria(
        'cat-profesional-001', 
        'Profesional', 
        'profesional'
      );
      profesional.actualizarComisiones(8.0, 12.0);
      this.categorias.set(profesional.id.valor, profesional);

      // Categoría amateur activa
      const amateur = new Categoria(
        'cat-amateur-001', 
        'Amateur', 
        'amateur'
      );
      amateur.actualizarComisiones(5.0, 7.0);
      this.categorias.set(amateur.id.valor, amateur);

      // Categoría junior activa
      const junior = new Categoria(
        'cat-junior-001', 
        'Junior', 
        'junior'
      );
      junior.actualizarComisiones(3.0, 5.0);
      this.categorias.set(junior.id.valor, junior);

      // Categoría inactiva para testing
      const inactiva = new Categoria(
        'cat-inactiva-001', 
        'Categoría Inactiva', 
        'inactiva'
      );
      inactiva.desactivar();
      this.categorias.set(inactiva.id.valor, inactiva);
    } catch (error) {
      console.error('Error inicializando datos mock de categorías:', error);
    }
  }

  /**
   * Simula latencia de base de datos
   * @private
   */
  async _simularLatencia(milisegundos) {
    return new Promise(resolve => setTimeout(resolve, milisegundos));
  }

  /**
   * Obtiene estadísticas de categorías (para monitoreo)
   * @returns {Promise<object>} Estadísticas de categorías
   */
  async obtenerEstadisticas() {
    try {
      await this._simularLatencia(200);
      const total = this.categorias.size;
      const activas = Array.from(this.categorias.values())
        .filter(cat => cat.estaActiva).length;
      const inactivas = total - activas;
      return {
        total,
        activas,
        inactivas,
        porcentajeActivas: total > 0 ? Math.round((activas / total) * 100) : 0
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
}

// Singleton para uso en toda la aplicación
const categoriaService = new CategoriaService();

module.exports = { categoriaService, CategoriaService };