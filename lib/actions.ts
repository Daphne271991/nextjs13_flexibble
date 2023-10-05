import { GraphQLClient } from "graphql-request";
import {
  createProjectMutation,
  createUserMutation,
  deleteProjectMutation,
  updateProjectMutation,
  getProjectByIdQuery,
  getProjectsOfUserQuery,
  getUserQuery,
  projectsQuery,
} from "@/graphql";
import { ProjectForm } from "@/common.types";

const isProduction = process.env.NODE_ENV === "production";
const apiUrl = isProduction
  ? process.env.NEXT_PUBLIC_GRAFBASE_API_URL || ""
  : "http://127.0.0.1:4000/graphql";
const apiKey = isProduction
  ? process.env.NEXT_PUBLIC_GRAFBASE_API_KEY || ""
  : "letmein";
const serverUrl = isProduction
  ? process.env.NEXT_PUBLIC_SERVER_URL
  : "http://localhost:3000";

const client = new GraphQLClient(apiUrl);

export const fetchToken = async (): Promise<any> => {
  try {
    const response = await fetch(`${serverUrl}/api/auth/token`);
    return response.json();
  } catch (err) {
    throw err;
  }
};

export const uploadImage = async (imagePath: string): Promise<any> => {
  try {
    const response = await fetch(`${serverUrl}/api/upload`, {
      method: "POST",
      body: JSON.stringify({
        path: imagePath,
      }),
    });
    return response.json();
  } catch (err) {
    throw err;
  }
};

const makeGraphQLRequest = async (
  query: string,
  variables = {}
): Promise<any> => {
  try {
    // Check for null specifically in the 'category' field
    if (variables.category === null) {
      variables.category = ""; // convert null to an empty string
    }

    return await client.request(query, variables);
  } catch (err) {
    throw err;
  }
};

export const fetchAllProjects = async (
  category?: string | null,
  endcursor?: string | null
): Promise<any> => {
  try {
    // Set the API key in the headers
    client.setHeader("x-api-key", apiKey);

    // Convert null to an empty string only for the 'category' field
    const variables = { category: category || "", endcursor };

    // Make the GraphQL request
    const response = await makeGraphQLRequest(projectsQuery, variables);

    // Return the response
    return response;
  } catch (err) {
    // Handle errors
    console.error("Error fetching projects:", err);
    throw err;
  }
};

export const createNewProject = async (
  form: ProjectForm,
  creatorId: string,
  token: string
): Promise<any> => {
  try {
    const imageUrl = await uploadImage(form.image);

    if (imageUrl.url) {
      client.setHeader("Authorization", `Bearer ${token}`);

      const variables: { input: any } = {
        input: {
          ...form,
          image: imageUrl.url,
          createdBy: {
            link: creatorId,
          },
        },
      };

      return makeGraphQLRequest(createProjectMutation, variables);
    }

    // If imageUrl.url is falsy, handle the error or return an appropriate response.
    throw new Error("Image upload failed");
  } catch (error) {
    // Handle errors
    console.error("Error creating a new project:", error);
    throw error;
  }
};

export const updateProject = async (
  form: ProjectForm,
  projectId: string,
  token: string
): Promise<any> => {
  function isBase64DataURL(value: string): boolean {
    const base64Regex = /^data:image\/[a-z]+;base64,/;
    return base64Regex.test(value);
  }

  let updatedForm = { ...form };

  const isUploadingNewImage = isBase64DataURL(form.image);

  if (isUploadingNewImage) {
    const imageUrl = await uploadImage(form.image);

    if (imageUrl.url) {
      updatedForm = { ...updatedForm, image: imageUrl.url };
    }
  }

  client.setHeader("Authorization", `Bearer ${token}`);

  const variables = {
    id: projectId,
    input: updatedForm,
  };

  return makeGraphQLRequest(updateProjectMutation, variables);
};

export const deleteProject = (id: string, token: string): Promise<any> => {
  client.setHeader("Authorization", `Bearer ${token}`);
  return makeGraphQLRequest(deleteProjectMutation, { id });
};

export const getProjectDetails = (id: string): Promise<any> => {
  client.setHeader("x-api-key", apiKey);
  return makeGraphQLRequest(getProjectByIdQuery, { id });
};

export const createUser = (
  name: string,
  email: string,
  avatarUrl: string
): Promise<any> => {
  client.setHeader("x-api-key", apiKey);

  const variables = {
    input: {
      name: name,
      email: email,
      avatarUrl: avatarUrl,
    },
  };

  return makeGraphQLRequest(createUserMutation, variables);
};

export const getUserProjects = (id: string, last?: number): Promise<any> => {
  client.setHeader("x-api-key", apiKey);
  return makeGraphQLRequest(getProjectsOfUserQuery, { id, last });
};

export const getUser = (email: string): Promise<any> => {
  client.setHeader("x-api-key", apiKey);
  return makeGraphQLRequest(getUserQuery, { email });
};
