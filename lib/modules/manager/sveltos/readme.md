Renovate uses the [Sveltos](https://projectsveltos.github.io/sveltos/) manager to update the dependencies in Helm-Charts for Sveltos resources.

Learn about Sveltos Helm-Charts by reading the [Sveltos documentation](https://projectsveltos.github.io/sveltos/addons/helm_charts/).

### You must set a `managerFilePatterns` pattern

The `sveltos` manager has no default `managerFilePatterns` pattern.
This is because there is are no common filename or directory name conventions for Sveltos YAML files.
You must set your own `managerFilePatterns` rules, so Renovate knows which `*.yaml` files are Sveltos definitions.

#### `managerFilePatterns` pattern examples

```json title="If most .yaml files in your repository are for Sveltos"
{
  "sveltos": {
    "managerFilePatterns": ["/\\.yaml$/"]
  }
}
```

```json title="Sveltos YAML files are in a sveltos/ directory"
{
  "sveltos": {
    "managerFilePatterns": ["/sveltos/.+\\.yaml$/"]
  }
}
```

```json title="One Sveltos file in a directory"
{
  "sveltos": {
    "managerFilePatterns": ["/^config/sveltos\\.yaml$/"]
  }
}
```

### Disabling parts of the sveltos manager

You can use these `depTypes` for fine-grained control, for example to disable parts of the Sveltos manager.

| Resource                                                                                             | `depType`        |
| :--------------------------------------------------------------------------------------------------- | :--------------- |
| [Cluster Profiles](https://projectsveltos.github.io/sveltos/addons/clusterprofile/)                  | `ClusterProfile` |
| [Profiles](https://projectsveltos.github.io/sveltos/addons/profile/)                                 | `Profile`        |
| [EventTrigger](https://projectsveltos.github.io/sveltos/events/addon_event_deployment/#eventtrigger) | `EventTrigger`   |
