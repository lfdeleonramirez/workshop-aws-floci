import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const FLOCI_IMAGE = 'floci/floci:latest';
const INTERNAL_NETWORK = 'workshop-internal';

export class DockerService {
  // Crear contenedor Floci para un usuario
  async createFlociContainer(port) {
    // Asegurar que la red interna existe
    await this.ensureNetwork();

    const container = await docker.createContainer({
      Image: FLOCI_IMAGE,
      name: `floci-user-${port}`,
      ExposedPorts: { '4566/tcp': {} },
      HostConfig: {
        PortBindings: {
          '4566/tcp': [{ HostPort: String(port), HostIp: '127.0.0.1' }]
        },
        Memory: 256 * 1024 * 1024, // 256 MB
        NanoCpus: 500000000,        // 0.5 CPU
        NetworkMode: INTERNAL_NETWORK,
        RestartPolicy: { Name: 'unless-stopped' }
      },
      Env: [
        'FLOCI_STORAGE_MODE=hybrid',
        'FLOCI_DEFAULT_REGION=us-east-1'
      ]
    });

    await container.start();
    return container;
  }

  // Eliminar contenedor
  async removeContainer(containerId) {
    try {
      const container = docker.getContainer(containerId);
      await container.stop({ t: 5 });
      await container.remove({ force: true });
    } catch (err) {
      // Si ya no existe, no pasa nada
      if (err.statusCode !== 404) throw err;
    }
  }

  // Crear red interna si no existe
  async ensureNetwork() {
    try {
      await docker.getNetwork(INTERNAL_NETWORK).inspect();
    } catch (err) {
      if (err.statusCode === 404) {
        await docker.createNetwork({
          Name: INTERNAL_NETWORK,
          Driver: 'bridge',
          Internal: true // Sin acceso a internet
        });
      }
    }
  }

  // Limpiar todos los contenedores del workshop
  async cleanupAll() {
    const containers = await docker.listContainers({
      all: true,
      filters: { name: ['floci-user-'] }
    });

    for (const containerInfo of containers) {
      await this.removeContainer(containerInfo.Id);
    }
  }
}
