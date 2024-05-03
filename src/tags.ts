import { Tags } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

import { getGitBuildInfo } from './build.js';
import { TagsData } from './data.js';
import { SecurityClassification } from './security.js';

export interface TagsBase {
  /**
   * Environment of the resource
   *
   * @example 'prod'
   *
   * @see AwsEnv in @linz/accounts
   */
  environment: 'nonprod' | 'preprod' | 'prod';

  /**
   * Application name
   *
   * @example "basemaps"
   */
  application: string;

  /**
   * Human friendly name for LINZ group that the resources belong to
   *
   * @example "step" or "li"
   */
  group: string;

  /**
   * Git repository that this construct belongs to
   *
   * @example
   * ```typescript
   * "linz/basemaps"
   * "linz/lds-cache"
   * ```
   *
   * Uses the $GITHUB_REPOSITORY env var by default
   *
   * @default "$GITHUB_REPOSITORY"
   */
  repository?: string;

  /**
   * Security classification of the construct
   *
   * @see https://www.digital.govt.nz/standards-and-guidance/governance/managing-online-channels/security-and-privacy-for-websites/foundations/classify-information/
   */
  classification: SecurityClassification;

  /**
   * Criticality of the resources
   */
  criticality: 'critical' | 'high' | 'medium' | 'low';

  /**
   * THe responder team listed in OpsGenie.
   * @see https://toitutewhenua.app.opsgenie.com/teams/list
   */
  responderTeam?: string;
  /**
   * skip collection of git info, commit, version etc
   * @default false
   */
  skipGitInfo?: boolean;

  /** Data classification tags */
  data?: TagsData;
}

// Apply a tag but skip application of tag if the value is undefined or empty
function tag(construct: IConstruct, key: string, value: string | undefined | null): void {
  if (value == null) return;
  if (value === '') return;

  Tags.of(construct).add(key, value);
}

export function applyTags(construct: IConstruct, ctx: TagsBase): void {
  // TODO is this check valid here?
  if (ctx.data?.isPublic && ctx.classification !== SecurityClassification.Unclassified) {
    throw new Error('Only unclassified constructs can be made public');
  }

  const buildInfo = ctx.skipGitInfo ? undefined : getGitBuildInfo();

  // applications tags
  tag(construct, 'linz.app.name', ctx.application);
  if (buildInfo) tag(construct, 'linz.app.version', buildInfo.version);
  tag(construct, 'linz.environment', ctx.environment);

  // Ownership tags
  tag(construct, 'linz.group', ctx.group);
  tag(construct, 'linz.responder.team', ctx.responderTeam ?? 'NotSet');
  tag(construct, 'linz.app.criticality', ctx.criticality);

  // Git Tags
  if (buildInfo) tag(construct, 'linz.git.hash', buildInfo.hash);
  tag(construct, 'linz.git.repository', process.env['GITHUB_REPOSITORY'] ?? ctx.repository);

  // Github actions build information
  if (buildInfo) tag(construct, 'linz.build.id', buildInfo.buildId);

  // Security
  tag(construct, 'linz.security.classification', ctx.classification);
  if (ctx.data) applyTagsData(construct, ctx.data);
}

export function applyTagsData(construct: IConstruct, tags: TagsData): void {
  tag(construct, 'linz.data.role', tags.role);
  tag(construct, 'linz.data.is-master', String(tags.isMaster ?? false));
  tag(construct, 'linz.data.is-public', String(tags.isPublic ?? false));
}
