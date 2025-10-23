import * as types from '../types';
import * as r from '../roles';
import * as p from '../permissions';
import type { AssistantsEndpoint } from '../schemas';
import {
  Tools,
  Assistant,
  AssistantCreateParams,
  AssistantUpdateParams,
  FunctionTool,
  AssistantDocument,
} from './assistants';
import type { ActionMetadata } from '../actions';

export type MutationOptions<
  Response,
  Request,
  Context = unknown,
  Error = unknown,
  Snapshot = void,
> = {
  onSuccess?: (data: Response, variables: Request, context?: Context) => void;
  onMutate?: (variables: Request) => Snapshot | Promise<Snapshot>;
  onError?: (error: Error, variables: Request, context?: Context, snapshot?: Snapshot) => void;
  onSettled?: (
    data: Response | undefined,
    error: Error | null,
    variables: Request,
    context?: Context,
  ) => void;
};

export type TGenTitleRequest = {
  conversationId: string;
};

export type TGenTitleResponse = {
  title: string;
};

export type PresetDeleteResponse = {
  acknowledged: boolean;
  deletedCount: number;
};

export type UpdatePresetOptions = MutationOptions<types.TPreset, types.TPreset>;

export type DeletePresetOptions = MutationOptions<PresetDeleteResponse, types.TPreset | undefined>;

/* Assistant mutations */

export type AssistantAvatarVariables = {
  assistant_id: string;
  model: string;
  formData: FormData;
  postCreation?: boolean;
  endpoint: types.AssistantsEndpoint;
  version: number | string;
};

export type UpdateActionVariables = {
  assistant_id: string;
  functions: FunctionTool[];
  metadata: ActionMetadata;
  action_id?: string;
  model: string;
  endpoint: types.AssistantsEndpoint;
  version: number | string;
};

export type UploadAssistantAvatarOptions = MutationOptions<Assistant, AssistantAvatarVariables>;

export type CreateAssistantMutationOptions = MutationOptions<Assistant, AssistantCreateParams>;

export type UpdateAssistantVariables = {
  assistant_id: string;
  data: AssistantUpdateParams;
};

export type UpdateAssistantMutationOptions = MutationOptions<Assistant, UpdateAssistantVariables>;

export type DeleteAssistantBody = {
  assistant_id: string;
  model: string;
  endpoint: types.AssistantsEndpoint;
};

export type DeleteAssistantMutationOptions = MutationOptions<
  void,
  Pick<DeleteAssistantBody, 'assistant_id'>
>;

export type DeleteConversationOptions = MutationOptions<
  types.TDeleteConversationResponse,
  types.TDeleteConversationRequest
>;

export type ArchiveConversationOptions = MutationOptions<
  types.TArchiveConversationResponse,
  types.TArchiveConversationRequest
>;

export type DuplicateConvoOptions = MutationOptions<
  types.TDuplicateConvoResponse,
  types.TDuplicateConvoRequest
>;

export type ForkConvoOptions = MutationOptions<types.TForkConvoResponse, types.TForkConvoRequest>;

export type CreateSharedLinkOptions = MutationOptions<
  types.TSharedLink,
  Partial<types.TSharedLink>
>;

export type updateTagsInConvoOptions = MutationOptions<
  types.TTagConversationResponse,
  types.TTagConversationRequest
>;

export type UpdateSharedLinkOptions = MutationOptions<
  types.TSharedLink,
  Partial<types.TSharedLink>
>;

export type ArchiveConvoOptions = MutationOptions<
  types.TArchiveConversationResponse,
  types.TArchiveConversationRequest
>;

export type DeleteSharedLinkContext = { previousQueries?: Map<string, TDeleteSharedLinkResponse> };
export type DeleteSharedLinkOptions = MutationOptions<
  TDeleteSharedLinkResponse,
  { shareId: string },
  DeleteSharedLinkContext
>;

export type TUpdatePromptContext =
  | {
      group?: types.TPromptGroup;
      previousListData?: types.PromptGroupListData;
    }
  | undefined;

export type UpdatePromptGroupOptions = MutationOptions<
  types.TUpdatePromptGroupResponse,
  types.TUpdatePromptGroupVariables,
  TUpdatePromptContext
>;

export type CreatePromptOptions = MutationOptions<types.TCreatePromptResponse, types.TCreatePrompt>;

export type DeletePromptOptions = MutationOptions<
  types.TDeletePromptResponse,
  types.TDeletePromptVariables
>;

export type DeletePromptGroupOptions = MutationOptions<
  types.TDeletePromptGroupResponse,
  types.TDeletePromptGroupRequest
>;

export type UpdatePromptLabelOptions = MutationOptions<
  types.TUpdatePromptLabelsResponse,
  types.TUpdatePromptLabelsRequest
>;

export type MakePromptProductionOptions = MutationOptions<
  types.TMakePromptProductionResponse,
  types.TMakePromptProductionRequest,
  TUpdatePromptContext
>;

/* Auth mutations */
export type VerifyEmailOptions = MutationOptions<types.VerifyEmailResponse, types.TVerifyEmail>;
export type ResendVerifcationOptions = MutationOptions<
  types.VerifyEmailResponse,
  types.TResendVerificationEmail
>;
export type RegistrationOptions = MutationOptions<
  types.TRegisterUserResponse,
  types.TRegisterUser,
  unknown,
  types.TError
>;

export type UpdatePermVars<T> = {
  roleName: string;
  updates: Partial<T>;
};

export type UpdatePromptPermVars = UpdatePermVars<p.TPromptPermissions>;
export type UpdateMemoryPermVars = UpdatePermVars<p.TMemoryPermissions>;
export type UpdatePeoplePickerPermVars = UpdatePermVars<p.TPeoplePickerPermissions>;

export type UpdatePermResponse = r.TRole;

export type UpdatePromptPermOptions = MutationOptions<
  UpdatePermResponse,
  UpdatePromptPermVars,
  unknown,
  types.TError | null | undefined
>;

export type UpdateMemoryPermOptions = MutationOptions<
  UpdatePermResponse,
  UpdateMemoryPermVars,
  unknown,
  types.TError | null | undefined
>;

export type UpdatePeoplePickerPermOptions = MutationOptions<
  UpdatePermResponse,
  UpdatePeoplePickerPermVars,
  unknown,
  types.TError | null | undefined
>;

export type UpdateMarketplacePermVars = UpdatePermVars<p.TMarketplacePermissions>;

export type UpdateMarketplacePermOptions = MutationOptions<
  UpdatePermResponse,
  UpdateMarketplacePermVars,
  unknown,
  types.TError | null | undefined
>;

export type UpdateConversationTagOptions = MutationOptions<
  types.TConversationTag,
  types.TConversationTagRequest
>;
export type DeleteConversationTagOptions = MutationOptions<types.TConversationTag, string>;

export type AcceptTermsMutationOptions = MutationOptions<
  types.TAcceptTermsResponse,
  void,
  unknown,
  void
>;

/* Tools */
export type UpdatePluginAuthOptions = MutationOptions<types.TUser, types.TUpdateUserPlugins>;

export type ToolParamsMap = {
  [Tools.execute_code]: {
    lang: string;
    code: string;
  };
};

export type ToolId = keyof ToolParamsMap;

export type ToolParams<T extends ToolId> = ToolParamsMap[T] & {
  messageId: string;
  partIndex?: number;
  blockIndex?: number;
  conversationId: string;
};
export type ToolCallResponse = { result: unknown; attachments?: types.TAttachment[] };
export type ToolCallMutationOptions<T extends ToolId> = MutationOptions<
  ToolCallResponse,
  ToolParams<T>
>;

export type TDeleteSharedLinkResponse = {
  success: boolean;
  shareId: string;
  message: string;
};

export type TEditArtifactRequest = {
  index: number;
  messageId: string;
  original: string;
  updated: string;
};

export type TEditArtifactResponse = Pick<types.TMessage, 'content' | 'text' | 'conversationId'>;

export type EditArtifactOptions = MutationOptions<
  TEditArtifactResponse,
  TEditArtifactRequest,
  unknown,
  Error
>;

export type TLogoutResponse = {
  message: string;
  redirect?: string;
};

export type LogoutOptions = MutationOptions<TLogoutResponse, undefined>;

export interface AssistantInitialize {
  message: string;
  error?: string;
}

export interface CancelMCPOAuthResponse {
  success: boolean;
  message: string;
}

export type DeleteAgentActionVariables = {
  agent_id: string;
  action_id: string;
};

export type UpdateAgentPermVars = {
  roleName: string;
  updates: Record<string, unknown>;
};

export type UpdateActionResponse = {
  success: boolean;
  message: string;
};

export type DeleteActionVariables = {
  action_id: string;
  version: number | string;
  assistant_id: string;
  model: string;
  endpoint: AssistantsEndpoint;
};

export type DuplicateAgentBody = {
  agent_id: string;
  name?: string;
};

export type DeleteAgentBody = {
  agent_id: string;
};

export type UpdateAgentActionVariables = {
  agent_id: string;
  action_id: string;
  data: Record<string, unknown>;
};

export type UpdateAgentActionResponse = {
  success: boolean;
  message: string;
};
